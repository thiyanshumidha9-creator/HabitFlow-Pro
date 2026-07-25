"""
HabitFlow Pro – Declarative Base & Shared Mixins.

Every ORM model inherits from ``Base``.
The ``TimestampMixin`` adds ``created_at`` / ``updated_at`` columns
automatically.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """
    SQLAlchemy declarative base for all HabitFlow models.

    Subclasses automatically participate in metadata / migration
    discovery.
    """

    pass


class TimestampMixin:
    """
    Mixin that adds ``created_at`` and ``updated_at`` columns.

    ``created_at`` is set once on INSERT.
    ``updated_at`` is refreshed on every UPDATE.
    """

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class UUIDMixin:
    """
    Mixin that provides a UUID primary key stored as a TEXT column.

    Using TEXT for UUIDs guarantees compatibility across SQLite
    (which lacks a native UUID type) and PostgreSQL.
    """

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        nullable=False,
    )
