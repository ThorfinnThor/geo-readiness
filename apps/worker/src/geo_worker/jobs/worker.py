"""Process one queued scan job within a single transaction.

Leasing and running share a transaction so the row lock is held for the whole
scan — no other worker can double-process it. The production loop wraps this
with commit/rollback; E16 adds lease expiry + retry recovery.
"""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from geo_worker.crawler.types import FetchFn
from geo_worker.db.enums import ScanStatus
from geo_worker.db.models import Scan
from geo_worker.security.resolver import Resolver

from .processor import run_scan_job
from .queue import lease_next_job, mark_dead, mark_succeeded


async def process_one(
    session: AsyncSession,
    worker_id: str,
    *,
    fetch_fn: FetchFn | None = None,
    resolver: Resolver | None = None,
    allow_raw_ip: bool = False,
) -> uuid.UUID | None:
    """Lease and run one job. Returns the job id processed, or None if idle."""
    job = await lease_next_job(session, worker_id)
    if job is None:
        return None

    scan_id = uuid.UUID(str(job.payload_json["scan_id"]))
    try:
        await run_scan_job(
            session, scan_id, fetch_fn=fetch_fn, resolver=resolver, allow_raw_ip=allow_raw_ip
        )
        await mark_succeeded(session, job)
    except Exception as exc:  # noqa: BLE001 — job must not crash the worker loop
        scan_row = (
            await session.execute(select(Scan).where(Scan.id == scan_id))
        ).scalar_one_or_none()
        if scan_row is not None:
            scan_row.status = ScanStatus.failed
            scan_row.error_code = type(exc).__name__
        await mark_dead(session, job, type(exc).__name__)
    return job.id
