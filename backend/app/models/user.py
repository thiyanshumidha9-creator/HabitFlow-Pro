"""
HabitFlow Pro – User & Refresh-Token ORM Models.

Tables:
    users          – application users (email + hashed password).
    refresh_tokens – one row per active refresh token, tied to a device.

Relationships:
    users 1 ──▸ N refresh_tokens   (cascade delete)
"""

from datetime import datetime, timezone
from typing import List

from sqlalchemy import Boolean, DateTime, Index, String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class User(Base, UUIDMixin, TimestampMixin):
    """
    Application user account.

    Columns:
        id            – UUID primary key (from UUIDMixin).
        email         – unique, indexed, case-insensitive lookup.
        full_name     – display name.
        password_hash – Argon2id hash (never store plain text).
        is_active     – soft-delete / disable flag.
        role          – 'user' or 'admin' (future RBAC).
        last_login_at – timestamp of the most recent successful login.
        created_at    – auto-set on INSERT (from TimestampMixin).
        updated_at    – auto-set on UPDATE (from TimestampMixin).
    """

    __tablename__ = "users"

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )
    full_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )
    password_hash: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )
    role: Mapped[str] = mapped_column(
        String(20),
        default="user",
        nullable=False,
    )
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # ── Relationships ──────────────────────────────────────────
    refresh_tokens: Mapped[List["RefreshToken"]] = relationship(
        "RefreshToken",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    # ── Table-Level Indexes ────────────────────────────────────
    __table_args__ = (
        Index("ix_users_email_active", "email", "is_active"),
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email}>"


class RefreshToken(Base, UUIDMixin, TimestampMixin):
    """
    Stores active refresh tokens.

    Each device / browser session creates one row.  Tokens are
    rotated on each use (old row deleted, new row inserted) to
    prevent replay attacks.

    Columns:
        id         – UUID primary key.
        user_id    – FK to ``users.id``.
        token_hash – SHA-256 hash of the JWT refresh token (never
                     store the raw token in the database).
        device_id  – client-generated UUID identifying the device.
        expires_at – when this token becomes invalid.
        is_revoked – manual revocation flag (logout).
    """

    __tablename__ = "refresh_tokens"

    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    token_hash: Mapped[str] = mapped_column(
        String(64),  # SHA-256 hex digest = 64 chars
        unique=True,
        nullable=False,
    )
    device_id: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    is_revoked: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    # ── Relationships ──────────────────────────────────────────
    user: Mapped["User"] = relationship(
        "User",
        back_populates="refresh_tokens",
    )

    # ── Table-Level Indexes ────────────────────────────────────
    __table_args__ = (
        Index("ix_refresh_tokens_user_device", "user_id", "device_id"),
        Index("ix_refresh_tokens_expires", "expires_at"),
    )

    def __repr__(self) -> str:
        return f"<RefreshToken id={self.id} user_id={self.user_id}>"

    @property
    def is_expired(self) -> bool:
        """Check whether this token has passed its expiry time."""
        return datetime.now(timezone.utc) > self.expires_at
