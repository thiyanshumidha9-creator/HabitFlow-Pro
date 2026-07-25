"""
HabitFlow Pro – Structured Logging Configuration.

Sets up structlog for JSON-formatted (production) or console-formatted
(development) log output.  Every log entry includes:
    - timestamp (ISO 8601)
    - level
    - module
    - message
    - optional extra fields (user_id, request_id, etc.)

Usage:
    from app.core.logging import get_logger
    logger = get_logger(__name__)
    logger.info("user_login", user_id="abc123")
"""

import logging
import sys

import structlog

from app.core.config import get_settings


def setup_logging() -> None:
    """
    Configure structlog processors and stdlib logging integration.

    Call once at application startup (in ``main.py``).
    """
    settings = get_settings()

    # ── Shared processors applied to every log event ───────────
    shared_processors: list = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.UnicodeDecoder(),
    ]

    # ── Choose renderer based on environment ───────────────────
    if settings.LOG_FORMAT == "json":
        renderer = structlog.processors.JSONRenderer()
    else:
        renderer = structlog.dev.ConsoleRenderer(colors=True)

    structlog.configure(
        processors=[
            *shared_processors,
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    # ── Configure stdlib root logger ───────────────────────────
    formatter = structlog.stdlib.ProcessorFormatter(
        processor=renderer,
        foreign_pre_chain=shared_processors,
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.addHandler(handler)
    root_logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))

    # Silence noisy third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(
        logging.INFO if settings.DEBUG else logging.WARNING
    )


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    """
    Return a named structlog logger.

    Args:
        name: Typically ``__name__`` of the calling module.

    Returns:
        A bound logger instance.
    """
    return structlog.get_logger(name)
