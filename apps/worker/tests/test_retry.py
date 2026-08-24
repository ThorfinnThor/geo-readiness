"""Worker retry taxonomy (§E16): transient failures retry, deterministic ones die."""

from __future__ import annotations

import datetime as dt
import uuid

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from geo_worker.crawler.types import RawResponse
from geo_worker.db.enums import JobStatus, JobType, ScanStatus, ScanType
from geo_worker.db.models import Job, Organization, Project, Scan, User
from geo_worker.jobs import is_retryable_error, process_one, retry_delay_seconds
from geo_worker.jobs.queue import enqueue_job
from geo_worker.security.errors import SSRFBlocked

PUBLIC = "93.184.216.34"


def test_is_retryable_error_classification() -> None:
    assert is_retryable_error(httpx.ConnectError("x"))
    assert is_retryable_error(httpx.ReadTimeout("x"))
    assert is_retryable_error(httpx.ConnectTimeout("x"))
    # Deterministic failures must NOT retry.
    assert not is_retryable_error(SSRFBlocked("blocked_host", "h"))
    assert not is_retryable_error(ValueError("bug"))
    assert not is_retryable_error(KeyError("missing"))


def test_retry_delay_backoff_is_exponential_and_capped() -> None:
    assert retry_delay_seconds(1) == 30
    assert retry_delay_seconds(2) == 60
    assert retry_delay_seconds(3) == 120
    assert retry_delay_seconds(10) == 600  # capped


async def _seed(session: AsyncSession, *, attempt: int = 0) -> tuple[uuid.UUID, uuid.UUID]:
    user = User(email=f"{uuid.uuid4()}@example.com")
    session.add(user)
    await session.flush()
    org = Organization(name="Org", owner_user_id=user.id)
    session.add(org)
    await session.flush()
    project = Project(organization_id=org.id, canonical_domain="ex.example")
    session.add(project)
    await session.flush()
    scan = Scan(
        project_id=project.id,
        scan_type=ScanType.quick,
        methodology_version="geo-readiness-v2",
        max_pages=12,
        max_browser_renders=2,
        status=ScanStatus.queued,
    )
    session.add(scan)
    await session.flush()
    await enqueue_job(session, JobType.crawl_project, {"scan_id": str(scan.id)}, str(scan.id))
    job = (
        await session.execute(select(Job).where(Job.idempotency_key == str(scan.id)))
    ).scalar_one()
    job.attempt = attempt
    await session.flush()
    return scan.id, job.id


def _raising_fetch(exc: BaseException):
    def fetch(_url: str, _ip: str, _max: int) -> RawResponse:
        raise exc

    return fetch


async def test_transient_error_requeues_with_backoff(session: AsyncSession) -> None:
    scan_id, job_id = await _seed(session)
    await process_one(
        session,
        "w1",
        fetch_fn=_raising_fetch(httpx.ConnectError("down")),
        resolver=lambda _h: [PUBLIC],
    )
    job = (await session.execute(select(Job).where(Job.id == job_id))).scalar_one()
    assert job.status == JobStatus.queued  # requeued, not dead
    assert job.attempt == 1
    assert job.error_code == "ConnectError"
    assert job.available_at > dt.datetime.now(dt.UTC)  # held back by backoff
    scan = (await session.execute(select(Scan).where(Scan.id == scan_id))).scalar_one()
    assert scan.status == ScanStatus.queued  # waiting for the retry, not failed


async def test_terminal_error_dead_letters(session: AsyncSession) -> None:
    scan_id, job_id = await _seed(session)
    await process_one(
        session, "w1", fetch_fn=_raising_fetch(ValueError("bug")), resolver=lambda _h: [PUBLIC]
    )
    job = (await session.execute(select(Job).where(Job.id == job_id))).scalar_one()
    assert job.status == JobStatus.dead
    scan = (await session.execute(select(Scan).where(Scan.id == scan_id))).scalar_one()
    assert scan.status == ScanStatus.failed


async def test_retryable_but_exhausted_dead_letters(session: AsyncSession) -> None:
    # attempt=4 → lease bumps to 5 == max_attempts (5) → no more retries.
    scan_id, job_id = await _seed(session, attempt=4)
    await process_one(
        session,
        "w1",
        fetch_fn=_raising_fetch(httpx.ConnectError("down")),
        resolver=lambda _h: [PUBLIC],
    )
    job = (await session.execute(select(Job).where(Job.id == job_id))).scalar_one()
    assert job.status == JobStatus.dead
    scan = (await session.execute(select(Scan).where(Scan.id == scan_id))).scalar_one()
    assert scan.status == ScanStatus.failed
