"""All domain tables (§7) plus the job queue (§31) and Stripe events (§27).

Design notes:
- UUID primary keys everywhere (non-enumerable cross-tenant IDs).
- Tenant-scoped columns (organization_id / project_id / scan_id) are indexed.
- ``*_json`` fields are JSONB.
- Enums are stored as VARCHAR (see enums.py); values validated in Python.
- Money is stored as integer minor units (cents); never trust client amounts (§27).
"""

from __future__ import annotations

import datetime as dt
import uuid

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy import (
    Enum as SqlEnum,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from .enums import (
    ActionSeverity,
    ActionStatus,
    JobStatus,
    JobType,
    PaymentStatus,
    ProjectStatus,
    ReportDepth,
    ScanStatus,
    ScanType,
    UserStatus,
)

# 0..100 scores and 0..1 confidences with two decimals.
Score = Numeric(6, 2)


def _enum(python_enum: type, name: str) -> SqlEnum:
    """VARCHAR column for a str Enum, storing the enum value.

    Enum values are validated in Python by the ORM ``Enum`` type on every
    write, plus Pydantic at the edges. We deliberately do NOT emit a DB CHECK
    (``create_constraint`` stays at SQLAlchemy 2.0's default of False):
    Alembic autogenerate cannot round-trip enum-generated CHECK constraints and
    would report perpetual false drift, defeating the migration drift guard.
    """
    return SqlEnum(
        python_enum,
        native_enum=False,
        length=32,
        name=name,
        values_callable=lambda e: [m.value for m in e],
    )


def _uuid_fk(target: str, *, nullable: bool = False, index: bool = True):
    return mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey(target, ondelete="CASCADE"),
        nullable=nullable,
        index=index,
    )


def _ts(nullable: bool = True):
    return mapped_column(DateTime(timezone=True), nullable=nullable)


# ─────────────────────────────── Identity ───────────────────────────────


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False)
    email_verified_at: Mapped[dt.datetime | None] = _ts()
    status: Mapped[UserStatus] = mapped_column(
        _enum(UserStatus, "user_status"),
        default=UserStatus.pending,
        server_default=UserStatus.pending.value,
        nullable=False,
    )


class Organization(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    owner_user_id: Mapped[uuid.UUID] = _uuid_fk("users.id")


class Project(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "projects"
    __table_args__ = (UniqueConstraint("organization_id", "canonical_domain"),)

    organization_id: Mapped[uuid.UUID] = _uuid_fk("organizations.id")
    canonical_domain: Mapped[str] = mapped_column(String(255), nullable=False)
    country_code: Mapped[str | None] = mapped_column(String(2))
    locale: Mapped[str | None] = mapped_column(String(16))
    status: Mapped[ProjectStatus] = mapped_column(
        _enum(ProjectStatus, "project_status"),
        default=ProjectStatus.active,
        server_default=ProjectStatus.active.value,
        nullable=False,
    )


# ──────────────────────────────── Scans ─────────────────────────────────


class Scan(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "scans"

    project_id: Mapped[uuid.UUID] = _uuid_fk("projects.id")
    scan_type: Mapped[ScanType] = mapped_column(_enum(ScanType, "scan_type"), nullable=False)
    methodology_version: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[ScanStatus] = mapped_column(
        _enum(ScanStatus, "scan_status"),
        default=ScanStatus.created,
        server_default=ScanStatus.created.value,
        nullable=False,
    )
    requested_at: Mapped[dt.datetime | None] = _ts()
    started_at: Mapped[dt.datetime | None] = _ts()
    completed_at: Mapped[dt.datetime | None] = _ts()
    max_pages: Mapped[int] = mapped_column(Integer, nullable=False)
    max_browser_renders: Mapped[int] = mapped_column(Integer, nullable=False)
    page_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    browser_render_count: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )
    error_code: Mapped[str | None] = mapped_column(String(64))


class CrawlPage(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "crawl_pages"

    scan_id: Mapped[uuid.UUID] = _uuid_fk("scans.id")
    normalized_url: Mapped[str] = mapped_column(Text, nullable=False)
    final_url: Mapped[str | None] = mapped_column(Text)
    status_code: Mapped[int | None] = mapped_column(Integer)
    content_type: Mapped[str | None] = mapped_column(String(128))
    title: Mapped[str | None] = mapped_column(Text)
    meta_description: Mapped[str | None] = mapped_column(Text)
    canonical_url: Mapped[str | None] = mapped_column(Text)
    robots_meta: Mapped[str | None] = mapped_column(String(255))
    language: Mapped[str | None] = mapped_column(String(16))
    h1: Mapped[str | None] = mapped_column(Text)
    headings_json: Mapped[dict | None] = mapped_column(JSONB)
    visible_text: Mapped[str | None] = mapped_column(Text)
    json_ld_json: Mapped[list | dict | None] = mapped_column(JSONB)
    internal_links_json: Mapped[list | None] = mapped_column(JSONB)
    external_links_json: Mapped[list | None] = mapped_column(JSONB)
    content_hash: Mapped[str | None] = mapped_column(String(64), index=True)
    render_method: Mapped[str | None] = mapped_column(String(16))
    fetch_duration_ms: Mapped[int | None] = mapped_column(Integer)


class Evidence(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "evidence"

    scan_id: Mapped[uuid.UUID] = _uuid_fk("scans.id")
    page_id: Mapped[uuid.UUID | None] = _uuid_fk("crawl_pages.id", nullable=True)
    evidence_type: Mapped[str] = mapped_column(String(64), nullable=False)
    field_name: Mapped[str] = mapped_column(String(128), nullable=False)
    value_json: Mapped[dict | list | None] = mapped_column(JSONB)
    source_url: Mapped[str | None] = mapped_column(Text)
    source_selector: Mapped[str | None] = mapped_column(Text)
    confidence: Mapped[float | None] = mapped_column(Score)


# ─────────────────────────── Business profile ───────────────────────────


class BusinessProfile(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "business_profiles"
    __table_args__ = (UniqueConstraint("scan_id"),)

    scan_id: Mapped[uuid.UUID] = _uuid_fk("scans.id")
    legal_name: Mapped[str | None] = mapped_column(String(255))
    brand_name: Mapped[str | None] = mapped_column(String(255))
    canonical_domain: Mapped[str | None] = mapped_column(String(255))
    aliases_json: Mapped[list | None] = mapped_column(JSONB)
    products_json: Mapped[list | None] = mapped_column(JSONB)
    services_json: Mapped[list | None] = mapped_column(JSONB)
    locations_json: Mapped[list | None] = mapped_column(JSONB)
    countries_json: Mapped[list | None] = mapped_column(JSONB)
    languages_json: Mapped[list | None] = mapped_column(JSONB)
    industries_json: Mapped[list | None] = mapped_column(JSONB)
    target_audiences_json: Mapped[list | None] = mapped_column(JSONB)
    evidence_summary_json: Mapped[dict | None] = mapped_column(JSONB)
    profile_hash: Mapped[str | None] = mapped_column(String(64), index=True)


# ──────────────────────────────── Clusters ──────────────────────────────


class PromptCluster(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "prompt_clusters"
    __table_args__ = (UniqueConstraint("scan_id", "cluster_key"),)

    scan_id: Mapped[uuid.UUID] = _uuid_fk("scans.id")
    cluster_key: Mapped[str] = mapped_column(String(64), nullable=False)
    intent: Mapped[str] = mapped_column(String(64), nullable=False)
    topic: Mapped[str | None] = mapped_column(String(255))
    service: Mapped[str | None] = mapped_column(String(255))
    product: Mapped[str | None] = mapped_column(String(255))
    location: Mapped[str | None] = mapped_column(String(255))
    audience: Mapped[str | None] = mapped_column(String(255))
    language: Mapped[str | None] = mapped_column(String(16))
    commercial_intent: Mapped[float | None] = mapped_column(Score)
    relevance: Mapped[float | None] = mapped_column(Score)
    weight: Mapped[float | None] = mapped_column(Score)
    generation_method: Mapped[str] = mapped_column(
        String(32), default="rule_v1", server_default="rule_v1", nullable=False
    )
    template_version: Mapped[str | None] = mapped_column(String(32))


class ClusterPrompt(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "cluster_prompts"

    cluster_id: Mapped[uuid.UUID] = _uuid_fk("prompt_clusters.id")
    prompt_key: Mapped[str] = mapped_column(String(64), nullable=False)
    prompt_text: Mapped[str] = mapped_column(Text, nullable=False)
    variant_index: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )
    template_id: Mapped[str | None] = mapped_column(String(64))


class ClusterCoverage(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "cluster_coverage"
    __table_args__ = (UniqueConstraint("cluster_id"),)

    cluster_id: Mapped[uuid.UUID] = _uuid_fk("prompt_clusters.id")
    coverage_score: Mapped[float | None] = mapped_column(Score)
    matched_requirements_json: Mapped[list | None] = mapped_column(JSONB)
    missing_requirements_json: Mapped[list | None] = mapped_column(JSONB)
    supporting_page_ids_json: Mapped[list | None] = mapped_column(JSONB)
    confidence: Mapped[float | None] = mapped_column(Score)


# ──────────────────────────── Readiness / actions ───────────────────────


class ReadinessSnapshot(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "readiness_snapshots"

    scan_id: Mapped[uuid.UUID] = _uuid_fk("scans.id")
    overall_score: Mapped[float | None] = mapped_column(Score)
    entity_clarity_score: Mapped[float | None] = mapped_column(Score)
    offer_clarity_score: Mapped[float | None] = mapped_column(Score)
    prompt_coverage_score: Mapped[float | None] = mapped_column(Score)
    sourceability_score: Mapped[float | None] = mapped_column(Score)
    structured_data_score: Mapped[float | None] = mapped_column(Score)
    evidence_trust_score: Mapped[float | None] = mapped_column(Score)
    technical_access_score: Mapped[float | None] = mapped_column(Score)
    confidence_score: Mapped[float | None] = mapped_column(Score)
    methodology_version: Mapped[str] = mapped_column(String(64), nullable=False)


class Action(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "actions"

    scan_id: Mapped[uuid.UUID] = _uuid_fk("scans.id")
    rule_id: Mapped[str] = mapped_column(String(32), nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    severity: Mapped[ActionSeverity] = mapped_column(
        _enum(ActionSeverity, "action_severity"), nullable=False
    )
    priority_score: Mapped[float | None] = mapped_column(Score)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    problem: Mapped[str | None] = mapped_column(Text)
    evidence_json: Mapped[dict | list | None] = mapped_column(JSONB)
    recommendation: Mapped[str | None] = mapped_column(Text)
    expected_signal: Mapped[str | None] = mapped_column(Text)
    measurement_hint: Mapped[str | None] = mapped_column(Text)
    confidence: Mapped[float | None] = mapped_column(Score)
    status: Mapped[ActionStatus] = mapped_column(
        _enum(ActionStatus, "action_status"),
        default=ActionStatus.open,
        server_default=ActionStatus.open.value,
        nullable=False,
    )


class Report(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Generated report artifact — supports paid report history (§26/§39)."""

    __tablename__ = "reports"

    scan_id: Mapped[uuid.UUID] = _uuid_fk("scans.id")
    organization_id: Mapped[uuid.UUID] = _uuid_fk("organizations.id")
    project_id: Mapped[uuid.UUID] = _uuid_fk("projects.id")
    depth: Mapped[ReportDepth] = mapped_column(_enum(ReportDepth, "report_depth"), nullable=False)
    content_json: Mapped[dict | None] = mapped_column(JSONB)
    generated_at: Mapped[dt.datetime | None] = _ts()


# ──────────────────────────────── Payments ──────────────────────────────


class Payment(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "payments"

    organization_id: Mapped[uuid.UUID] = _uuid_fk("organizations.id")
    project_id: Mapped[uuid.UUID] = _uuid_fk("projects.id")
    scan_id: Mapped[uuid.UUID | None] = _uuid_fk("scans.id", nullable=True)
    provider: Mapped[str] = mapped_column(
        String(32), default="stripe", server_default="stripe", nullable=False
    )
    stripe_customer_id: Mapped[str | None] = mapped_column(String(255))
    stripe_checkout_session_id: Mapped[str | None] = mapped_column(String(255), unique=True)
    stripe_payment_intent_id: Mapped[str | None] = mapped_column(String(255))
    product_code: Mapped[str] = mapped_column(String(64), nullable=False)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)  # minor units
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    status: Mapped[PaymentStatus] = mapped_column(
        _enum(PaymentStatus, "payment_status"),
        default=PaymentStatus.pending,
        server_default=PaymentStatus.pending.value,
        nullable=False,
    )
    paid_at: Mapped[dt.datetime | None] = _ts()
    refunded_at: Mapped[dt.datetime | None] = _ts()


class StripeEvent(UUIDPrimaryKeyMixin, Base):
    """Webhook idempotency ledger (§27). Never store secrets here."""

    __tablename__ = "stripe_events"

    stripe_event_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    event_type: Mapped[str] = mapped_column(String(128), nullable=False)
    received_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    processed_at: Mapped[dt.datetime | None] = _ts()
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    payload_hash: Mapped[str | None] = mapped_column(String(64))


# ──────────────────────────────── Job queue ─────────────────────────────


class Job(UUIDPrimaryKeyMixin, Base):
    """PostgreSQL job queue (§31). Polled with FOR UPDATE SKIP LOCKED in E04/E16."""

    __tablename__ = "jobs"

    job_type: Mapped[JobType] = mapped_column(_enum(JobType, "job_type"), nullable=False)
    payload_json: Mapped[dict | None] = mapped_column(JSONB)
    status: Mapped[JobStatus] = mapped_column(
        _enum(JobStatus, "job_status"),
        default=JobStatus.queued,
        server_default=JobStatus.queued.value,
        nullable=False,
        index=True,
    )
    priority: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    attempt: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    max_attempts: Mapped[int] = mapped_column(
        Integer, default=5, server_default="5", nullable=False
    )
    available_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    lease_until: Mapped[dt.datetime | None] = _ts()
    worker_id: Mapped[str | None] = mapped_column(String(128))
    started_at: Mapped[dt.datetime | None] = _ts()
    completed_at: Mapped[dt.datetime | None] = _ts()
    error_code: Mapped[str | None] = mapped_column(String(64))
    error_detail_redacted: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
