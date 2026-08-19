"""Model / constraint behaviour against a real Postgres schema."""

from __future__ import annotations

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from geo_worker.db.enums import ScanStatus, ScanType, UserStatus
from geo_worker.db.models import Organization, Project, Scan, User


async def _make_org(session: AsyncSession) -> Organization:
    user = User(email="owner@example.com")
    session.add(user)
    await session.flush()
    org = Organization(name="Acme", owner_user_id=user.id)
    session.add(org)
    await session.flush()
    return org


async def test_create_identity_chain(session: AsyncSession) -> None:
    org = await _make_org(session)
    project = Project(organization_id=org.id, canonical_domain="acme.example")
    session.add(project)
    await session.flush()

    got = (await session.execute(select(Project).where(Project.id == project.id))).scalar_one()
    assert got.canonical_domain == "acme.example"
    assert got.status.value == "active"  # server default applied


async def test_project_domain_unique_per_org(session: AsyncSession) -> None:
    org = await _make_org(session)
    session.add(Project(organization_id=org.id, canonical_domain="dup.example"))
    await session.flush()
    session.add(Project(organization_id=org.id, canonical_domain="dup.example"))
    with pytest.raises(IntegrityError):
        await session.flush()


async def test_enum_stored_as_value(session: AsyncSession) -> None:
    org = await _make_org(session)
    project = Project(organization_id=org.id, canonical_domain="enum.example")
    session.add(project)
    await session.flush()
    scan = Scan(
        project_id=project.id,
        scan_type=ScanType.quick,
        methodology_version="geo-readiness-v1",
        max_pages=12,
        max_browser_renders=2,
    )
    session.add(scan)
    await session.flush()

    # Raw value persisted as the enum's .value, and default status applied.
    raw = (
        await session.execute(
            select(Scan.__table__.c.scan_type, Scan.__table__.c.status).where(
                Scan.__table__.c.id == scan.id
            )
        )
    ).one()
    assert raw.scan_type == ScanType.quick.value == "quick"
    assert raw.status == ScanStatus.created.value == "created"


async def test_user_status_default(session: AsyncSession) -> None:
    user = User(email="pending@example.com")
    session.add(user)
    await session.flush()
    assert user.status == UserStatus.pending
