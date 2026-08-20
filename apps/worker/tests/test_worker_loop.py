"""E16 — lease recovery + resilient loop orchestration."""

from __future__ import annotations

import asyncio
import datetime as dt
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from geo_worker.db.enums import JobStatus, JobType, ScanStatus, ScanType
from geo_worker.db.models import Job, Organization, Project, Scan, User
from geo_worker.jobs import loop as loop_mod
from geo_worker.jobs import run_worker_loop
from geo_worker.jobs.queue import enqueue_job, recover_stale_jobs


async def _seed_running_job(
    session: AsyncSession, *, attempt: int, max_attempts: int, lease_delta_s: int
) -> tuple[uuid.UUID, uuid.UUID]:
    """Create a scan + a job stuck in ``running`` with a lease ``lease_delta_s``
    seconds from now (negative = expired)."""
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
        status=ScanStatus.crawling,
    )
    session.add(scan)
    await session.flush()

    await enqueue_job(session, JobType.crawl_project, {"scan_id": str(scan.id)}, str(scan.id))
    job = (
        await session.execute(select(Job).where(Job.idempotency_key == str(scan.id)))
    ).scalar_one()
    now = dt.datetime.now(dt.UTC)
    job.status = JobStatus.running
    job.worker_id = "dead-worker"
    job.attempt = attempt
    job.max_attempts = max_attempts
    job.started_at = now
    job.lease_until = now + dt.timedelta(seconds=lease_delta_s)
    await session.flush()
    return job.id, scan.id


async def test_recover_requeues_expired_running_job(session: AsyncSession) -> None:
    job_id, scan_id = await _seed_running_job(session, attempt=1, max_attempts=5, lease_delta_s=-10)
    requeued, dead = await recover_stale_jobs(session)
    assert (requeued, dead) == (1, 0)
    job = (await session.execute(select(Job).where(Job.id == job_id))).scalar_one()
    assert job.status == JobStatus.queued
    assert job.worker_id is None
    assert job.lease_until is None


async def test_recover_deadletters_when_attempts_exhausted(session: AsyncSession) -> None:
    job_id, scan_id = await _seed_running_job(session, attempt=5, max_attempts=5, lease_delta_s=-10)
    requeued, dead = await recover_stale_jobs(session)
    assert (requeued, dead) == (0, 1)
    job = (await session.execute(select(Job).where(Job.id == job_id))).scalar_one()
    assert job.status == JobStatus.dead
    assert job.error_code == "lease_expired"
    scan = (await session.execute(select(Scan).where(Scan.id == scan_id))).scalar_one()
    assert scan.status == ScanStatus.failed
    assert scan.error_code == "lease_expired"


async def test_recover_ignores_fresh_lease(session: AsyncSession) -> None:
    job_id, _ = await _seed_running_job(session, attempt=1, max_attempts=5, lease_delta_s=300)
    requeued, dead = await recover_stale_jobs(session)
    assert (requeued, dead) == (0, 0)
    job = (await session.execute(select(Job).where(Job.id == job_id))).scalar_one()
    assert job.status == JobStatus.running


async def test_loop_drains_then_stops(monkeypatch) -> None:
    # Orchestration only: stub DB-touching helpers so no commits happen.
    recover_calls = 0
    process_calls = 0

    async def fake_recover(_sf):
        nonlocal recover_calls
        recover_calls += 1

    async def fake_process(_sf, _wid):
        nonlocal process_calls
        process_calls += 1
        return uuid.uuid4() if process_calls <= 2 else None  # 2 jobs, then idle

    monkeypatch.setattr(loop_mod, "_recover", fake_recover)
    monkeypatch.setattr(loop_mod, "_process", fake_process)

    stop = asyncio.Event()

    async def stopper():
        # Let a few iterations run, then request shutdown.
        await asyncio.sleep(0.05)
        stop.set()

    await asyncio.gather(
        run_worker_loop(
            object(),  # session_factory unused (helpers are stubbed)
            "w-test",
            idle_sleep=0.01,
            recover_every=0.0,  # recover every iteration
            stop_event=stop,
            install_signal_handlers=False,
        ),
        stopper(),
    )
    assert process_calls >= 2  # drained the two available jobs
    assert recover_calls >= 1  # recovery ran
