"""Process all queued scan jobs once, then exit.

The runnable worker for local dev and the demo (a container/cron can invoke it
on an interval). A resilient long-running loop with lease recovery is E16.

    uv run python scripts/process_jobs.py
"""

from __future__ import annotations

import asyncio

from geo_worker.db.session import create_engine, create_session_factory
from geo_worker.jobs import process_one

WORKER_ID = "local-worker"


async def main() -> None:
    engine = create_engine()
    session_factory = create_session_factory(engine)
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
