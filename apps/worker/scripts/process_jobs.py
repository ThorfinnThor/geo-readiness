"""Reclaim stranded jobs, then process all queued scan jobs once, and exit.

The drain-once entrypoint: local dev, and the GitHub Actions worker (triggered
per scan via repository_dispatch, plus a safety-net cron). For an always-on host
use scripts/run_worker.py (the resilient loop) instead.

    uv run python scripts/process_jobs.py
"""

from __future__ import annotations

import asyncio
import os
import socket

from geo_worker.db.session import create_engine, create_session_factory
from geo_worker.jobs import process_one, recover_stale_jobs

WORKER_ID = os.environ.get("WORKER_ID") or f"drain-{socket.gethostname()}"


async def main() -> None:
    engine = create_engine()
    session_factory = create_session_factory(engine)

    # Reclaim jobs stranded by a killed worker/runner before draining (E16).
    async with session_factory() as session:
        requeued, dead = await recover_stale_jobs(session)
        await session.commit()
    if requeued or dead:
        print(f"recovered stale jobs: requeued={requeued} dead={dead}")

    processed = 0
    while True:
        async with session_factory() as session:
            job_id = await process_one(session, WORKER_ID)
            await session.commit()
        if job_id is None:
            break
        processed += 1
        print(f"processed job {job_id}")
    await engine.dispose()
    print(f"done ({processed} job(s))")


if __name__ == "__main__":
    asyncio.run(main())
