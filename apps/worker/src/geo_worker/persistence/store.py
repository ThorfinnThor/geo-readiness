"""Write a completed scan's results into the database."""

from __future__ import annotations

import datetime as dt
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from geo_worker.db.enums import ActionSeverity, ActionStatus, ReportDepth, ScanStatus
from geo_worker.db.models import (
    Action,
    BusinessProfile,
    Project,
    ReadinessSnapshot,
    Report,
    Scan,
)
from geo_worker.pipeline.report import ReportDocument
from geo_worker.pipeline.runner import ScanResult


async def persist_scan_result(
    session: AsyncSession,
    scan_id: uuid.UUID,
    scan: ScanResult,
    report: ReportDocument,
    *,
    status: ScanStatus,
) -> uuid.UUID:
    """Persist snapshot, profile, actions, and the report; update the scan.

    Runs within the caller's transaction and returns the new report id.
    """
    scan_row = (await session.execute(select(Scan).where(Scan.id == scan_id))).scalar_one()
    project = (
        await session.execute(select(Project).where(Project.id == scan_row.project_id))
    ).scalar_one()

    now = dt.datetime.now(dt.UTC)
    scan_row.status = status
    scan_row.completed_at = now
    scan_row.page_count = scan.pages_analyzed

    r = scan.readiness
    session.add(
        ReadinessSnapshot(
            scan_id=scan_id,
            overall_score=r.overall_score,
            entity_clarity_score=r.entity_clarity_score,
            offer_clarity_score=r.offer_clarity_score,
            prompt_coverage_score=r.prompt_coverage_score,
            sourceability_score=r.sourceability_score,
            structured_data_score=r.structured_data_score,
            evidence_trust_score=r.evidence_trust_score,
            technical_access_score=r.technical_access_score,
            confidence_score=r.confidence_score,
            methodology_version=r.methodology_version,
            retrieval_readiness_score=r.retrieval_readiness_score,
            citation_readiness_score=r.citation_readiness_score,
            answer_extractability_score=r.answer_extractability_score,
            methodology_hash=scan.methodology_hash,
            measurement_as_of=scan.as_of,
        )
    )

    p = scan.profile
    session.add(
        BusinessProfile(
            scan_id=scan_id,
            legal_name=p.legal_name,
            brand_name=p.brand_name,
            canonical_domain=p.canonical_domain,
            aliases_json=p.aliases,
            products_json=p.products,
            services_json=p.services,
            locations_json=p.locations,
            countries_json=p.countries,
            languages_json=p.languages,
            industries_json=p.industries,
            target_audiences_json=p.target_audiences,
            evidence_summary_json={"needs_confirmation": p.needs_confirmation},
            profile_hash=p.profile_hash,
        )
    )

    for action in scan.actions:
        session.add(
            Action(
                scan_id=scan_id,
                rule_id=action.rule_id,
                category=action.category,
                severity=ActionSeverity(action.severity),
                priority_score=action.priority_score,
                title=action.title,
                problem=action.problem,
                evidence_json=action.evidence,
                recommendation=action.recommendation,
                expected_signal=action.expected_signal,
                measurement_hint=action.how_to_verify,
                confidence=action.confidence,
                status=ActionStatus.open,
            )
        )

    depth = ReportDepth.full if scan.scan_type == "full" else ReportDepth.preview
    report_row = Report(
        scan_id=scan_id,
        organization_id=project.organization_id,
        project_id=project.id,
        depth=depth,
        content_json=report.model_dump(),
        generated_at=now,
    )
    session.add(report_row)
    await session.flush()
    return report_row.id
