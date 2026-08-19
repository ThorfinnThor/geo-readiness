"""Job queue + scan processing.

The web API enqueues a scan job (Postgres queue); the worker leases one with
FOR UPDATE SKIP LOCKED, runs the pipeline, and persists the result. Full lease
recovery / retry policy is E16.
"""

from .processor import run_scan_job
from .queue import enqueue_job, lease_next_job, mark_dead, mark_succeeded
from .worker import process_one

__all__ = [
    "enqueue_job",
    "lease_next_job",
    "mark_dead",
    "mark_succeeded",
    "process_one",
    "run_scan_job",
]
