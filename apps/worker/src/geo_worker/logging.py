"""Structured JSON logging for the worker.

Logs are JSON by default and MUST NOT contain full crawled page text
(§34 Privacy, §36 Observability). Callers pass only bounded, non-sensitive
fields as key/value pairs.
"""

from __future__ import annotations

import logging

import structlog


def configure_logging(level: str = "info") -> None:
    """Configure structlog to emit JSON to stdout at the given level."""
    log_level = getattr(logging, level.upper(), logging.INFO)
    logging.basicConfig(format="%(message)s", level=log_level)
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso", utc=True),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(log_level),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str | None = None) -> structlog.stdlib.BoundLogger:
    """Return a bound structlog logger."""
    return structlog.get_logger(name)
