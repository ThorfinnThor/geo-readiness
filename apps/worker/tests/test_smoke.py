"""E00 smoke tests: package imports, config defaults, logging configures."""

from __future__ import annotations

import geo_worker
from geo_worker.config import Settings
from geo_worker.logging import configure_logging, get_logger


def test_package_version() -> None:
    assert geo_worker.__version__ == "0.0.0"


def test_settings_defaults() -> None:
    settings = Settings()
    assert settings.methodology_version == "geo-readiness-v2"
    assert settings.free_max_pages == 12
    assert settings.free_max_render == 2


def test_logging_configures_and_binds() -> None:
    configure_logging("info")
    log = get_logger("test")
    # Should not raise; page text is never logged (§34).
    log.info("scan_started", scan_id="abc123", page_count=0)
