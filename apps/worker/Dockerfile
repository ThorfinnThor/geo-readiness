# GEO Readiness worker — the always-on Python queue drainer (E16).
# BUILD FROM THE REPO ROOT so both apps/worker and the root configs/ are in context:
#   docker build -f apps/worker/Dockerfile -t geo-worker .
# On Railway/Render set the Dockerfile path to apps/worker/Dockerfile and the
# build root to the repository root.

FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim

ENV PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/opt/venv \
    CONFIGS_DIR=/app/configs

WORKDIR /app/apps/worker

# 1) Dependency layer (cached until the lockfile changes).
COPY apps/worker/pyproject.toml apps/worker/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# 2) Application: worker package + Alembic + entrypoints, and the versioned
#    methodology configs (repo-root configs/, referenced via CONFIGS_DIR).
COPY apps/worker/ ./
COPY configs/ /app/configs/
RUN uv sync --frozen --no-dev

# Run outstanding migrations, then drain the queue until SIGTERM. Use the
# pre-synced venv directly (no runtime re-sync, no dev deps). Migrations are
# idempotent; safe to run on every start / every replica.
CMD ["sh", "-c", "/opt/venv/bin/alembic upgrade head && exec /opt/venv/bin/python scripts/run_worker.py"]
