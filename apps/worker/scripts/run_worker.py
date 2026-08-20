"""Production worker entrypoint (§E16) — the always-on queue drainer.

Runs the resilient loop until SIGTERM/SIGINT. Deploy this on the worker host
(Railway/Render/Fly). Env: DATABASE_URL_ASYNC (postgresql+asyncpg://…) and
optionally WORKER_ID (defaults to the hostname).

    uv run python scripts/run_worker.py

Contrast with process_jobs.py, which drains once and exits (local/dev + cron).
"""

from __future__ import annotations

import asyncio
import logging
import os
import socket

from geo_worker.db.session import create_engine, create_session_factory
from geo_worker.jobs import run_worker_loop


async def main() -> None:
    logging.basicConfig(
        level=os.environ.get("LOG_LEVEL", "INFO").upper(),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    worker_id = os.environ.get("WORKER_ID") or socket.gethostname()
    engine = create_engine()
    session_factory = create_session_factory(engine)
    try:
        await run_worker_loop(session_factory, worker_id)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
