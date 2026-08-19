"""Worker configuration loaded from the environment.

Values here mirror .env.example. Budgets are server-side only (§38) and the
methodology version pins reproducibility (§33).
"""

from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = Field(default="development")
    log_level: str = Field(default="info")
    methodology_version: str = Field(default="geo-readiness-v1")

    database_url_async: str = Field(default="postgresql+asyncpg://geo:geo@localhost:5432/geo")

    # Free Scan Economics Guard (§38) — all server-side.
    free_max_pages: int = Field(default=12)
    free_max_render: int = Field(default=2)
    free_max_bytes: int = Field(default=26_214_400)
    free_max_runtime_seconds: int = Field(default=120)
    free_domain_cooldown_hours: int = Field(default=24)


def get_settings() -> Settings:
    """Load settings from the environment."""
    return Settings()
