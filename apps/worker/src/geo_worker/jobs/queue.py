"""PostgreSQL job queue helpers (§31)."""

from __future__ import annotations

import datetime as dt
import uuid

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from geo_worker.db.enums import JobStatus, JobType, ScanStatus
from geo_worker.db.models import Job, Scan

DEFAULT_LEASE_SECONDS = 300


async def enqueue_job(
    session: AsyncSession,
    job_type: JobType,
    payload: dict,
    idempotency_key: str,
    *,
    priority: int = 0,
) -> uuid.UUID:
    """Insert a job idempotently; returns the job id (existing or new)."""
    stmt = (
        pg_insert(Job)
        .values(
            job_type=job_type,
            payload_json=payload,
            idempotency_key=idempotency_key,
            priority=priority,
            status=JobStatus.queued,
        )
        .on_conflict_do_nothing(index_elements=["idempotency_key"])
        .returning(Job.id)
    )
    result = (await session.execute(stmt)).scalar_one_or_none()
    if result is not None:
        return result
    existing = await session.execute(select(Job.id).where(Job.idempotency_key == idempotency_key))
    return existing.scalar_one()


async def lease_next_job(
    session: AsyncSession, worker_id: str, *, lease_seconds: int = DEFAULT_LEASE_SECONDS
) -> Job | None:
    """Atomically lease the highest-priority ready job (FOR UPDATE SKIP LOCKED)."""
    stmt = (
        select(Job)
        .where(Job.status == JobStatus.queued, Job.available_at <= func.now())
        .order_by(Job.priority.desc(), Job.created_at)
        .limit(1)
        .with_for_update(skip_locked=True)
    )
    job = (await session.execute(stmt)).scalars().first()
    if job is None:
        return None
    now = dt.datetime.now(dt.UTC)
    job.status = JobStatus.running
    job.started_at = now
    job.worker_id = worker_id
    job.attempt += 1
    job.lease_until = now + dt.timedelta(seconds=lease_seconds)
    await session.flush()
    return job


async def recover_stale_jobs(session: AsyncSession, *, batch: int = 20) -> tuple[int, int]:
    """Reclaim jobs whose worker died mid-run (§E16 lease recovery).

    A job left ``running`` with an expired ``lease_until`` means the worker
    crashed or was killed (e.g. a deploy) before finishing. Requeue it until
    ``max_attempts`` is reached, then dead-letter it and fail its scan so the
    UI stops waiting. Uses SKIP LOCKED so it is safe to run concurrently on
    every worker. Returns ``(requeued, dead)`` counts.
    """
    stmt = (
        select(Job)
        .where(Job.status == JobStatus.running, Job.lease_until < func.now())
        .order_by(Job.lease_until)
        .limit(batch)
        .with_for_update(skip_locked=True)
    )
    jobs = (await session.execute(stmt)).scalars().all()
    now = dt.datetime.now(dt.UTC)
    requeued = dead = 0
    for job in jobs:
        if job.attempt >= job.max_attempts:
            job.status = JobStatus.dead
            job.error_code = "lease_expired"
            job.completed_at = now
            await _fail_scan(session, job, "lease_expired")
            dead += 1
        else:
            # Return to the ready pool; attempt was already incremented at lease.
            job.status = JobStatus.queued
            job.worker_id = None
            job.lease_until = None
            job.started_at = None
            job.available_at = now
            requeued += 1
    await session.flush()
    return requeued, dead


async def _fail_scan(session: AsyncSession, job: Job, error_code: str) -> None:
    scan_id = (job.payload_json or {}).get("scan_id")
    if scan_id is None:
        return
    scan = (
        await session.execute(select(Scan).where(Scan.id == uuid.UUID(str(scan_id))))
    ).scalar_one_or_none()
    if scan is not None and scan.status not in (ScanStatus.completed, ScanStatus.failed):
        scan.status = ScanStatus.failed
        scan.error_code = error_code


async def mark_succeeded(session: AsyncSession, job: Job) -> None:
    job.status = JobStatus.succeeded
    job.completed_at = dt.datetime.now(dt.UTC)
    await session.flush()


async def mark_dead(session: AsyncSession, job: Job, error_code: str) -> None:
    """Terminal failure (retry policy is E16; here we dead-letter)."""
    job.status = JobStatus.dead
    job.error_code = error_code
    job.completed_at = dt.datetime.now(dt.UTC)
    await session.flush()
