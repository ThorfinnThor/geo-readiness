"""Resilient worker loop (§E16).

A long-running daemon for the production worker host (Railway/Render/Fly). It:

  * periodically reclaims jobs stranded by a crashed/killed worker
    (``recover_stale_jobs`` — lease expiry),
  * leases and runs one job at a time (``process_one``), committing per job,
  * drains continuously while work exists and sleeps briefly when idle,
  * shuts down gracefully on SIGTERM/SIGINT: the in-flight job finishes and is
    committed before exit (a deploy will not corrupt a scan).

Each job runs in its own transaction; a failure marks that scan failed and
dead-letters the job without stopping the loop.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
import signal

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from .queue import recover_stale_jobs
from .worker import process_one

logger = logging.getLogger("geo_worker.jobs.loop")


async def _recover(session_factory: async_sessionmaker[AsyncSession]) -> None:
    async with session_factory() as session:
        requeued, dead = await recover_stale_jobs(session)
        await session.commit()
    if requeued or dead:
        logger.warning("recovered stale jobs: requeued=%d dead=%d", requeued, dead)


async def _process(session_factory: async_sessionmaker[AsyncSession], worker_id: str):
    async with session_factory() as session:
        job_id = await process_one(session, worker_id)
        await session.commit()
    return job_id


async def run_worker_loop(
    session_factory: async_sessionmaker[AsyncSession],
    worker_id: str,
    *,
    idle_sleep: float = 2.0,
    recover_every: float = 30.0,
    stop_event: asyncio.Event | None = None,
    install_signal_handlers: bool = True,
    max_iterations: int | None = None,
) -> None:
    """Run the worker until ``stop_event`` is set (or ``max_iterations`` in tests)."""
    stop = stop_event or asyncio.Event()
    if install_signal_handlers:
        _install_signal_handlers(stop)

    logger.info("worker loop starting: worker_id=%s", worker_id)
    loop = asyncio.get_running_loop()
    next_recover = 0.0
    iterations = 0
    while not stop.is_set():
        now = loop.time()
        if now >= next_recover:
            try:
                await _recover(session_factory)
            except Exception:  # recovery must never kill the loop
                logger.exception("lease recovery failed")
            next_recover = now + recover_every

        try:
            job_id = await _process(session_factory, worker_id)
        except Exception:  # a transport/DB hiccup should back off, not crash
            logger.exception("job processing raised; backing off")
            job_id = None

        iterations += 1
        if max_iterations is not None and iterations >= max_iterations:
            break

        if job_id is None:
            # Idle: wait, but wake immediately on shutdown.
            with contextlib.suppress(asyncio.TimeoutError):
                await asyncio.wait_for(stop.wait(), timeout=idle_sleep)
        # else: drain — loop again right away.

    logger.info("worker loop stopped: worker_id=%s", worker_id)


def _install_signal_handlers(stop: asyncio.Event) -> None:
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        with contextlib.suppress(NotImplementedError):  # e.g. Windows
            loop.add_signal_handler(sig, stop.set)
