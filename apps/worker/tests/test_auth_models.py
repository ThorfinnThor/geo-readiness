"""Constraint behaviour for the E02 auth/tenancy tables."""

from __future__ import annotations

import datetime as dt
import uuid

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from geo_worker.db.auth_models import OrganizationMember, Session, UserCredential
from geo_worker.db.enums import MemberRole
from geo_worker.db.models import Organization, User


async def _user_and_org(session: AsyncSession, email: str) -> tuple[User, Organization]:
    user = User(email=email)
    session.add(user)
    await session.flush()
    org = Organization(name="Acme", owner_user_id=user.id)
    session.add(org)
    await session.flush()
    return user, org


async def test_membership_unique_per_org_user(session: AsyncSession) -> None:
    user, org = await _user_and_org(session, "m1@example.com")
    session.add(OrganizationMember(organization_id=org.id, user_id=user.id, role=MemberRole.owner))
    await session.flush()
    session.add(OrganizationMember(organization_id=org.id, user_id=user.id))
    with pytest.raises(IntegrityError):
        await session.flush()


async def test_credential_one_per_user(session: AsyncSession) -> None:
    user, _ = await _user_and_org(session, "c1@example.com")
    session.add(UserCredential(user_id=user.id, password_hash="argon2$dummy"))
    await session.flush()
    session.add(UserCredential(user_id=user.id, password_hash="argon2$other"))
    with pytest.raises(IntegrityError):
        await session.flush()


async def test_session_token_hash_unique(session: AsyncSession) -> None:
    user, _ = await _user_and_org(session, "s1@example.com")
    expires = dt.datetime.now(dt.UTC) + dt.timedelta(days=1)
    session.add(Session(user_id=user.id, token_hash="a" * 64, expires_at=expires))
    await session.flush()
    session.add(Session(user_id=uuid.uuid4(), token_hash="a" * 64, expires_at=expires))
    with pytest.raises(IntegrityError):
        await session.flush()
