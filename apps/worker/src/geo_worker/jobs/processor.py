"""Run a scan job: pipeline → persistence."""

from __future__ import annotations

import datetime as dt
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from geo_worker.crawler.transport import httpx_fetch
from geo_worker.crawler.types import FetchFn
from geo_worker.db.enums import ScanStatus
from geo_worker.db.models import Project, Scan
from geo_worker.persistence import persist_scan_result
from geo_worker.pipeline import build_report, run_pipeline
from geo_worker.security.resolver import Resolver, system_resolver


async def run_scan_job(
    session: AsyncSession,
    scan_id: uuid.UUID,
    *,
    fetch_fn: FetchFn | None = None,
    resolver: Resolver | None = None,
    allow_raw_ip: bool = False,
) -> ScanStatus:
    """Load the scan, run the pipeline against its domain, and persist results."""
    row = (
        await session.execute(
            select(Scan, Project)
            .join(Project, Scan.project_id == Project.id)
            .where(Scan.id == scan_id)
        )
    ).first()
    if row is None:
        return ScanStatus.failed
    scan_row, project = row

    scan_row.status = ScanStatus.crawling
    scan_row.started_at = dt.datetime.now(dt.UTC)
    await session.flush()

    result = run_pipeline(
        f"https://{project.canonical_domain}",
        scan_type=scan_row.scan_type.value,
        methodology_version=scan_row.methodology_version,
        fetch_fn=fetch_fn or httpx_fetch,
        resolver=resolver or system_resolver,
        allow_raw_ip=allow_raw_ip,
    )

    if result.pages_analyzed == 0:
        scan_row.status = ScanStatus.failed
        scan_row.error_code = "no_pages_crawled"
        await session.flush()
        return ScanStatus.failed

    status = (
        ScanStatus.partial
        if result.crawl_status in ("partial", "cancelled")
        else ScanStatus.completed
    )
    report = build_report(result)
    await persist_scan_result(session, scan_id, result, report, status=status)
    return status
