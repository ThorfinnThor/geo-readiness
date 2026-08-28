"""enable row level security on all public tables

Closes the Supabase "RLS Disabled in Public" advisor findings. Our app connects as
the table owner (the postgres role), which BYPASSES RLS, so every query keeps
working unchanged. The Supabase Data API's anon/authenticated roles are not owners,
so once RLS is on and we add no policies they get zero rows — the tables can no
longer be read through the Data API even if the anon key leaks. We do not use the
Data API at all (no supabase-js, direct Postgres only), so no policies are needed.

Reversible: `alembic downgrade -1` disables RLS again.

Revision ID: e3f1a9c7b2d4
Revises: aaa69085a4a2
Create Date: 2026-08-28 00:00:00.000000+00:00
"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e3f1a9c7b2d4"
down_revision: str | None = "aaa69085a4a2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        DO $$
        DECLARE t record;
        BEGIN
          FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
          LOOP
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
          END LOOP;
        END $$;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DO $$
        DECLARE t record;
        BEGIN
          FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
          LOOP
            EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', t.tablename);
          END LOOP;
        END $$;
        """
    )
