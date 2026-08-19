"""Enumerations for status/type columns.

Stored as VARCHAR (native_enum=False at the column). Value enforcement is at the
ORM/Pydantic layer; see the note in models._enum for why no DB CHECK is emitted.
"""

from __future__ import annotations

import enum


class UserStatus(enum.StrEnum):
    pending = "pending"
    active = "active"
    disabled = "disabled"


class ProjectStatus(enum.StrEnum):
    active = "active"
    archived = "archived"


class ScanType(enum.StrEnum):
    quick = "quick"
    full = "full"


class ScanStatus(enum.StrEnum):
    # Scan state machine (§32).
    created = "created"
    queued = "queued"
    crawling = "crawling"
    extracting = "extracting"
    profiling = "profiling"
    clustering = "clustering"
    coverage = "coverage"
    scoring = "scoring"
    actions = "actions"
    report = "report"
    completed = "completed"
    partial = "partial"
    failed = "failed"
    cancelled = "cancelled"


class JobType(enum.StrEnum):
    # Job types (§31).
    crawl_project = "crawl_project"
    parse_page = "parse_page"
    build_profile = "build_profile"
    generate_clusters = "generate_clusters"
    compute_coverage = "compute_coverage"
    compute_readiness = "compute_readiness"
    generate_actions = "generate_actions"
    build_report = "build_report"


class JobStatus(enum.StrEnum):
    # Job queue states (§31).
    queued = "queued"
    leased = "leased"
    running = "running"
    succeeded = "succeeded"
    retry_wait = "retry_wait"
    failed = "failed"
    dead = "dead"
    cancelled = "cancelled"


class PaymentStatus(enum.StrEnum):
    pending = "pending"
    paid = "paid"
    failed = "failed"
    expired = "expired"
    refunded = "refunded"


class ActionSeverity(enum.StrEnum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class ActionStatus(enum.StrEnum):
    open = "open"
    acknowledged = "acknowledged"
    resolved = "resolved"
    dismissed = "dismissed"


class ReportDepth(enum.StrEnum):
    preview = "preview"
    full = "full"
