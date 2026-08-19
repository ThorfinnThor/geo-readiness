"""Database layer: declarative base, models, and async session helpers.

The Python engine owns the schema and the Alembic migrations; this is the
single source of truth for the database (Supabase Postgres in production,
local docker-compose Postgres in dev/tests). See ADR 0001.
"""
