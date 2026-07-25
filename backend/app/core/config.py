"""
HabitFlow Pro – Application Configuration.

Centralised settings loaded from environment variables (.env file).
All keys are prefixed with HF_ to avoid collisions.

Uses pydantic-settings for type-safe, validated configuration.
"""

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application-wide configuration.

    Values are read from environment variables prefixed with ``HF_``.
    A ``.env`` file in the project root is loaded automatically.
    """

    model_config = SettingsConfigDict(
        env_prefix="HF_",
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ────────────────────────────────────────────
    APP_NAME: str = "HabitFlow Pro"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "production"  # development | staging | production

    # ── Server ─────────────────────────────────────────────────
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    # ── Database ───────────────────────────────────────────────
    DATABASE_URL: str = "sqlite:///./habitflow.db"

    # ── JWT ────────────────────────────────────────────────────
    JWT_SECRET_KEY: str = "CHANGE_ME"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # ── Security ───────────────────────────────────────────────
    RATE_LIMIT_PER_MINUTE: int = 60
    ARGON2_TIME_COST: int = 2
    ARGON2_MEMORY_COST: int = 102400
    ARGON2_PARALLELISM: int = 8

    # ── Logging ────────────────────────────────────────────────
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"  # json | console

    # ── Computed Properties ────────────────────────────────────

    @property
    def allowed_origins_list(self) -> List[str]:
        """Parse comma-separated origins into a list."""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    @property
    def is_development(self) -> bool:
        """Check if running in development mode."""
        return self.ENVIRONMENT == "development"

    @property
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return self.ENVIRONMENT == "production"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """
    Return the singleton Settings instance.

    Cached so the .env file is only parsed once per process.
    """
    return Settings()
