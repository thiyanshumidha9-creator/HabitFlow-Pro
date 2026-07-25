"""
HabitFlow Pro – Authentication Service.

Contains all business logic for user registration, login, token
refresh, and logout.  Routers delegate to these functions rather
than embedding logic directly.

All database mutations happen here so that the router layer stays
thin and testable.
"""

import hashlib
from datetime import datetime, timedelta, timezone
from typing import Tuple

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import AuthenticationError, ConflictError
from app.core.logging import get_logger
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_password,
    verify_password,
)
from app.models.user import RefreshToken, User

logger = get_logger(__name__)


# ═══════════════════════════════════════════════════════════════
# Public API
# ═══════════════════════════════════════════════════════════════

def signup(
    db: Session,
    email: str,
    full_name: str,
    password: str,
    device_id: str = "web",
) -> Tuple[User, str, str]:
    """
    Register a new user account.

    Args:
        db:        Active database session.
        email:     Email address (must be unique).
        full_name: Display name.
        password:  Plain-text password (will be hashed).
        device_id: Client device identifier.

    Returns:
        Tuple of (User, access_token, refresh_token).

    Raises:
        ConflictError: If a user with the same email already exists.
    """
    # ── Check for existing user ────────────────────────────────
    existing = db.query(User).filter(User.email == email.lower()).first()
    if existing:
        raise ConflictError(
            message="A user with this email address already exists.",
            errors=[{"field": "email", "message": "Email is already registered."}],
        )

    # ── Create user ────────────────────────────────────────────
    user = User(
        email=email.lower().strip(),
        full_name=full_name.strip(),
        password_hash=hash_password(password),
        last_login_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.flush()  # Assign id without committing

    logger.info("user_signup", user_id=user.id, email=user.email)

    # ── Issue tokens ───────────────────────────────────────────
    access_token, refresh_token = _issue_tokens(db, user, device_id)

    return user, access_token, refresh_token


def login(
    db: Session,
    email: str,
    password: str,
    device_id: str = "web",
) -> Tuple[User, str, str]:
    """
    Authenticate a user by email + password.

    Args:
        db:        Active database session.
        email:     User email.
        password:  Plain-text password.
        device_id: Client device identifier.

    Returns:
        Tuple of (User, access_token, refresh_token).

    Raises:
        AuthenticationError: If credentials are invalid.
    """
    user = db.query(User).filter(User.email == email.lower()).first()

    if user is None or not verify_password(password, user.password_hash):
        logger.warning("login_failed", email=email)
        raise AuthenticationError(message="Invalid email or password.")

    if not user.is_active:
        raise AuthenticationError(message="This account has been deactivated.")

    # ── Update last login timestamp ────────────────────────────
    user.last_login_at = datetime.now(timezone.utc)
    db.flush()

    logger.info("user_login", user_id=user.id)

    # ── Issue tokens ───────────────────────────────────────────
    access_token, refresh_token = _issue_tokens(db, user, device_id)

    return user, access_token, refresh_token


def refresh_tokens(
    db: Session,
    raw_refresh_token: str,
    device_id: str = "web",
) -> Tuple[User, str, str]:
    """
    Rotate a refresh token – issue new access + refresh tokens.

    The old refresh token row is deleted (rotate-and-revoke) to
    prevent replay attacks.

    Args:
        db:                Active database session.
        raw_refresh_token: The current refresh JWT.
        device_id:         Must match the device_id used at login.

    Returns:
        Tuple of (User, new_access_token, new_refresh_token).

    Raises:
        AuthenticationError: If the token is invalid, expired,
            revoked, or does not match the device.
    """
    # ── Decode and validate type ───────────────────────────────
    payload = decode_refresh_token(raw_refresh_token)
    user_id = payload.get("sub")

    if user_id is None:
        raise AuthenticationError(message="Invalid refresh token payload.")

    # ── Lookup the stored token hash ───────────────────────────
    token_hash = _hash_token(raw_refresh_token)
    stored = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.token_hash == token_hash,
            RefreshToken.user_id == user_id,
            RefreshToken.is_revoked == False,  # noqa: E712
        )
        .first()
    )

    if stored is None:
        logger.warning("refresh_token_not_found", user_id=user_id)
        raise AuthenticationError(message="Refresh token is invalid or has been revoked.")

    if stored.is_expired:
        db.delete(stored)
        db.flush()
        raise AuthenticationError(message="Refresh token has expired.")

    if stored.device_id != device_id:
        logger.warning("refresh_device_mismatch", user_id=user_id)
        raise AuthenticationError(message="Device mismatch. Please log in again.")

    # ── Load user ──────────────────────────────────────────────
    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active:
        raise AuthenticationError(message="User not found or deactivated.")

    # ── Rotate: delete old, issue new ──────────────────────────
    db.delete(stored)
    db.flush()

    logger.info("token_refresh", user_id=user.id)

    access_token, new_refresh_token = _issue_tokens(db, user, device_id)
    return user, access_token, new_refresh_token


def logout(db: Session, raw_refresh_token: str) -> None:
    """
    Revoke a refresh token (logout from one device).

    Args:
        db:                Active database session.
        raw_refresh_token: The refresh JWT to revoke.
    """
    token_hash = _hash_token(raw_refresh_token)
    stored = (
        db.query(RefreshToken)
        .filter(RefreshToken.token_hash == token_hash)
        .first()
    )

    if stored:
        db.delete(stored)
        db.flush()
        logger.info("user_logout", user_id=stored.user_id)
    else:
        # Token already revoked or expired – idempotent, no error.
        logger.info("logout_token_not_found")


def logout_all_devices(db: Session, user_id: str) -> int:
    """
    Revoke all refresh tokens for a user (logout everywhere).

    Args:
        db:      Active database session.
        user_id: The user's UUID.

    Returns:
        Number of tokens revoked.
    """
    count = (
        db.query(RefreshToken)
        .filter(RefreshToken.user_id == user_id)
        .delete(synchronize_session="fetch")
    )
    db.flush()
    logger.info("user_logout_all", user_id=user_id, revoked=count)
    return count


# ═══════════════════════════════════════════════════════════════
# Internal Helpers
# ═══════════════════════════════════════════════════════════════

def _issue_tokens(
    db: Session,
    user: User,
    device_id: str,
) -> Tuple[str, str]:
    """
    Create a new access + refresh token pair and persist the
    refresh token hash in the database.

    Any existing token for the same (user, device) is deleted
    first to enforce one-token-per-device.
    """
    settings = get_settings()

    # ── Revoke existing token for this device ──────────────────
    db.query(RefreshToken).filter(
        RefreshToken.user_id == user.id,
        RefreshToken.device_id == device_id,
    ).delete(synchronize_session="fetch")

    # ── Create JWTs ────────────────────────────────────────────
    access_token = create_access_token(subject=user.id)
    raw_refresh = create_refresh_token(subject=user.id)

    # ── Persist refresh token hash ─────────────────────────────
    token_row = RefreshToken(
        user_id=user.id,
        token_hash=_hash_token(raw_refresh),
        device_id=device_id,
        expires_at=datetime.now(timezone.utc)
        + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(token_row)
    db.flush()

    return access_token, raw_refresh


def _hash_token(raw_token: str) -> str:
    """
    SHA-256 hash of a raw JWT string.

    We store the hash – never the raw token – in the database to
    limit damage if the database is compromised.
    """
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
