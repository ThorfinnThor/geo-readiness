"""Persist scan results to Postgres (the E01 schema)."""

from .store import persist_scan_result

__all__ = ["persist_scan_result"]
