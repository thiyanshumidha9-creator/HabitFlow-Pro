"""
HabitFlow Pro – FastAPI Dependency Injection.

Common dependencies injected into route handlers via ``Depends()``:
    - ``get_db``           → Database session (re-exported from database.session).
    - ``get_current_user`` → Authenticated User ORM instance.
"""

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.exceptions import AuthenticationError
from app.core.logging import get_logger
from app.core.security import decode_access_token
from app.database.session import get_db  # noqa: F401 – re-export
from app.models.user import User

logger = get_logger(__name__)

# ── Bearer Token Extractor ─────────────────────────────────────
# auto_error=False so we can return a custom error envelope
# instead of FastAPI's default 403.
_bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Extract and validate the JWT from the ``Authorization`` header,
    then load the corresponding ``User`` from the database.

    Args:
        request:     The incoming HTTP request.
        credentials: Bearer token extracted by FastAPI.
        db:          Database session.

    Returns:
        The authenticated ``User`` ORM instance.

    Raises:
        AuthenticationError: If the token is missing, invalid, or
            the user does not exist / is deactivated.
    """
    if credentials is None:
        raise AuthenticationError(message="Authorization header is missing.")

    token = credentials.credentials
    payload = decode_access_token(token)

    user_id: str | None = payload.get("sub")
    if user_id is None:
        raise AuthenticationError(message="Token payload missing subject.")

    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        logger.warning("auth_user_not_found", user_id=user_id)
        raise AuthenticationError(message="User not found.")

    if not user.is_active:
        logger.warning("auth_inactive_user", user_id=user_id)
        raise AuthenticationError(message="User account is deactivated.")

    return user
