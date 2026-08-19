"""Auth & tenancy tables (E02).

Defined here (Python/Alembic owns the schema) and queried by the Next.js auth
layer — see ADR 0002. Only hashes are stored: never plaintext passwords, never
raw session or verification tokens.
"""

from __future__ import annotations

import datetime as dt
import uuid

from sqlalchemy import (
    Boolean,
    DateTime,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from .enums import MemberRole
from .models import _enum, _ts, _uuid_fk


class OrganizationMember(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """User ↔ organization membership; drives the tenant context."""

    __tablename__ = "organization_members"
    __table_args__ = (UniqueConstraint("organization_id", "user_id"),)

    organization_id: Mapped[uuid.UUID] = _uuid_fk("organizations.id")
    user_id: Mapped[uuid.UUID] = _uuid_fk("users.id")
    role: Mapped[MemberRole] = mapped_column(
        _enum(MemberRole, "member_role"),
        default=MemberRole.member,
        server_default=MemberRole.member.value,
        nullable=False,
    )


class UserCredential(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Argon2id password hash, 1:1 with a user."""

    __tablename__ = "user_credentials"
    __table_args__ = (UniqueConstraint("user_id"),)

    user_id: Mapped[uuid.UUID] = _uuid_fk("users.id")
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)


class Session(UUIDPrimaryKeyMixin, Base):
    """Server-side session. Stores sha256(token), never the token itself."""

    __tablename__ = "sessions"

    user_id: Mapped[uuid.UUID] = _uuid_fk("users.id")
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    last_used_at: Mapped[dt.datetime | None] = _ts()
    expires_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[dt.datetime | None] = _ts()
    user_agent: Mapped[str | None] = mapped_column(Text)
    ip_hash: Mapped[str | None] = mapped_column(String(64))


class EmailVerificationToken(UUIDPrimaryKeyMixin, Base):
    """Single-use hashed email-verification token."""

    __tablename__ = "email_verification_tokens"

    user_id: Mapped[uuid.UUID] = _uuid_fk("users.id")
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    expires_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    consumed_at: Mapped[dt.datetime | None] = _ts()
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class LoginAttempt(UUIDPrimaryKeyMixin, Base):
    """Login attempt ledger for rate limiting (hardened in E15)."""

    __tablename__ = "login_attempts"

    email: Mapped[str] = mapped_column(String(320), nullable=False, index=True)
    ip_hash: Mapped[str | None] = mapped_column(String(64), index=True)
    successful: Mapped[bool] = mapped_column(Boolean, nullable=False)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
