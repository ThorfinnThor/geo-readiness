"""Shared DB test fixtures.

Tests require a reachable Postgres (DATABASE_URL_ASYNC; defaults to the local
docker-compose database). The schema is created from the Alembic migrations —
which also proves "migration from empty DB" (E01 acceptance).
"""

from __future__ import annotations

from collections.abc import AsyncIterator

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from geo_worker.config import get_settings
from tests.support import run_alembic


@pytest.fixture(scope="session", autouse=True)
def _migrated_schema() -> AsyncIterator[None]:
    """Bring the DB to head from empty for the test session; tear back to base."""
    run_alembic("upgrade", "head")
    yield
    run_alembic("downgrade", "base")


@pytest_asyncio.fixture
async def session() -> AsyncIterator[AsyncSession]:
    """A session wrapped in a transaction that is rolled back after each test."""
    engine = create_async_engine(get_settings().database_url_async)
    conn = await engine.connect()
    trans = await conn.begin()
    sess = AsyncSession(bind=conn, expire_on_commit=False)
    try:
        yield sess
    finally:
        await sess.close()
        if trans.is_active:
            await trans.rollback()
        await conn.close()
        await engine.dispose()
