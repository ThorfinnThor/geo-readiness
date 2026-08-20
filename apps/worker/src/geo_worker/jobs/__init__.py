"""Job queue + scan processing.

The web API enqueues a scan job (Postgres queue); the worker leases one with
FOR UPDATE SKIP LOCKED, runs the pipeline, and persists the result. The resilient
production loop with lease recovery lives in ``loop.run_worker_loop`` (E16).
"""

from .loop import run_worker_loop
from .processor import run_scan_job
from .queue import (
    enqueue_job,
    lease_next_job,
    mark_dead,
    mark_succeeded,
    recover_stale_jobs,
)
from .worker import process_one

__all__ = [
    "enqueue_job",
    "lease_next_job",
    "mark_dead",
    "mark_succeeded",
    "process_one",
    "recover_stale_jobs",
    "run_scan_job",
    "run_worker_loop",
]
