"""Async engine and session factory.

Uses the async URL from settings (``postgresql+asyncpg://…``). Migrations are
run by Alembic (see alembic/); this module is the runtime data path.
"""

from __future__ import annotations

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from geo_worker.config import get_settings


def create_engine(url: str | None = None, *, echo: bool = False) -> AsyncEngine:
    settings = get_settings()
    return create_async_engine(url or settings.database_url_async, echo=echo, pool_pre_ping=True)


def create_session_factory(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(engine, expire_on_commit=False)


async def session_scope(
    session_factory: async_sessionmaker[AsyncSession],
) -> AsyncIterator[AsyncSession]:
    """Yield a session, committing on success and rolling back on error."""
    async with session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
