"""
HabitFlow Pro – Security Utilities.

Provides:
    - Password hashing & verification   (Argon2id via passlib)
    - JWT access / refresh token creation & decoding
    - Token-type validation helpers

All parameters (algorithm, cost factors, expiry) are driven by ``Settings``.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
from uuid import uuid4

import jwt
from passlib.context import CryptContext

from app.core.config import get_settings
from app.core.exceptions import AuthenticationError
from app.core.logging import get_logger

logger = get_logger(__name__)

# ── Password Hashing Context ──────────────────────────────────
# Uses Argon2id (memory-hard) as the primary scheme.
pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto",
)


# ═══════════════════════════════════════════════════════════════
# Password Utilities
# ═══════════════════════════════════════════════════════════════

def hash_password(plain_password: str) -> str:
    """
    Hash a plain-text password with Argon2id.

    Args:
        plain_password: The user's raw password.

    Returns:
        Argon2id hash string safe for database storage.
    """
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain-text password against an Argon2id hash.

    Args:
        plain_password:  The user's raw password.
        hashed_password: The stored hash from the database.

    Returns:
        ``True`` if the password matches, ``False`` otherwise.
    """
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        # Malformed hash or unexpected error – treat as mismatch.
        logger.warning("password_verify_failed", reason="hash_error")
        return False


# ═══════════════════════════════════════════════════════════════
# JWT Token Utilities
# ═══════════════════════════════════════════════════════════════

# Token type constants embedded in the JWT payload.
TOKEN_TYPE_ACCESS = "access"
TOKEN_TYPE_REFRESH = "refresh"


def create_access_token(
    subject: str,
    extra_claims: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Create a short-lived JWT access token.

    Args:
        subject:      The ``user_id`` (UUID string).
        extra_claims: Optional additional payload fields.

    Returns:
        Encoded JWT string.
    """
    settings = get_settings()
    expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return _create_token(
        subject=subject,
        token_type=TOKEN_TYPE_ACCESS,
        expires_delta=expires_delta,
        extra_claims=extra_claims,
    )


def create_refresh_token(
    subject: str,
    extra_claims: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Create a long-lived JWT refresh token.

    Args:
        subject:      The ``user_id`` (UUID string).
        extra_claims: Optional additional payload fields.

    Returns:
        Encoded JWT string.
    """
    settings = get_settings()
    expires_delta = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    return _create_token(
        subject=subject,
        token_type=TOKEN_TYPE_REFRESH,
        expires_delta=expires_delta,
        extra_claims=extra_claims,
    )


def decode_token(token: str) -> Dict[str, Any]:
    """
    Decode and validate a JWT token.

    Args:
        token: The raw JWT string.

    Returns:
        The decoded payload dictionary.

    Raises:
        AuthenticationError: If the token is expired, malformed, or invalid.
    """
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except jwt.ExpiredSignatureError:
        logger.info("token_expired")
        raise AuthenticationError(message="Token has expired.")
    except jwt.InvalidTokenError as exc:
        logger.warning("token_invalid", error=str(exc))
        raise AuthenticationError(message="Invalid token.")


def decode_access_token(token: str) -> Dict[str, Any]:
    """
    Decode a token and verify it is an **access** token.

    Raises:
        AuthenticationError: If the token type is not ``access``.
    """
    payload = decode_token(token)
    if payload.get("type") != TOKEN_TYPE_ACCESS:
        raise AuthenticationError(message="Invalid token type. Expected access token.")
    return payload


def decode_refresh_token(token: str) -> Dict[str, Any]:
    """
    Decode a token and verify it is a **refresh** token.

    Raises:
        AuthenticationError: If the token type is not ``refresh``.
    """
    payload = decode_token(token)
    if payload.get("type") != TOKEN_TYPE_REFRESH:
        raise AuthenticationError(message="Invalid token type. Expected refresh token.")
    return payload


# ═══════════════════════════════════════════════════════════════
# Internal Helpers
# ═══════════════════════════════════════════════════════════════

def _create_token(
    subject: str,
    token_type: str,
    expires_delta: timedelta,
    extra_claims: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Internal helper that builds and encodes a JWT.

    Payload structure:
        {
            "sub":  "<user_id>",
            "type": "access" | "refresh",
            "iat":  <issued-at timestamp>,
            "exp":  <expiry timestamp>,
            ...extra_claims
        }
    """
    settings = get_settings()
    now = datetime.now(timezone.utc)

    payload: Dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "jti": str(uuid4()),
        "iat": now,
        "exp": now + expires_delta,
    }

    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
