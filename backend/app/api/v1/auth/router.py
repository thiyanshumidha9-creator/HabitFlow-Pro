"""
HabitFlow Pro – Authentication Routes.

Endpoints:
    POST /signup   → Register a new user.
    POST /login    → Obtain access + refresh tokens.
    POST /refresh  → Rotate refresh token.
    POST /logout   → Revoke a refresh token.
    GET  /me       → Return the authenticated user's profile.

All responses use the standard envelope from ``schemas.common``.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.deps import get_current_user, get_db
from app.core.logging import get_logger
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    SignupRequest,
    TokenResponse,
)
from app.schemas.common import SuccessResponse
from app.schemas.user import UserResponse
from app.services import auth_service

logger = get_logger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ═══════════════════════════════════════════════════════════════
# POST /signup
# ═══════════════════════════════════════════════════════════════

@router.post(
    "/signup",
    response_model=SuccessResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
    responses={
        409: {"description": "Email already registered"},
        422: {"description": "Validation error"},
    },
)
def signup(body: SignupRequest, db: Session = Depends(get_db)):
    """
    Create a new user and return access + refresh tokens.

    The password is hashed with Argon2id before storage.
    """
    settings = get_settings()
    user, access_token, refresh_token = auth_service.signup(
        db=db,
        email=body.email,
        full_name=body.full_name,
        password=body.password,
    )

    return SuccessResponse(
        message="Account created successfully.",
        data={
            "user": UserResponse.model_validate(user).model_dump(),
            "tokens": TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            ).model_dump(),
        },
    )


# ═══════════════════════════════════════════════════════════════
# POST /login
# ═══════════════════════════════════════════════════════════════

@router.post(
    "/login",
    response_model=SuccessResponse,
    summary="Authenticate and obtain tokens",
    responses={
        401: {"description": "Invalid credentials"},
    },
)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    """
    Validate email + password and return access + refresh tokens.
    """
    settings = get_settings()
    user, access_token, refresh_token = auth_service.login(
        db=db,
        email=body.email,
        password=body.password,
        device_id=body.device_id,
    )

    return SuccessResponse(
        message="Login successful.",
        data={
            "user": UserResponse.model_validate(user).model_dump(),
            "tokens": TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            ).model_dump(),
        },
    )


# ═══════════════════════════════════════════════════════════════
# POST /refresh
# ═══════════════════════════════════════════════════════════════

@router.post(
    "/refresh",
    response_model=SuccessResponse,
    summary="Rotate refresh token and obtain new access token",
    responses={
        401: {"description": "Invalid or expired refresh token"},
    },
)
def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    """
    Exchange a valid refresh token for a new access + refresh pair.

    The old refresh token is revoked (rotate-and-revoke pattern).
    """
    settings = get_settings()
    user, access_token, new_refresh = auth_service.refresh_tokens(
        db=db,
        raw_refresh_token=body.refresh_token,
        device_id=body.device_id,
    )

    return SuccessResponse(
        message="Token refreshed successfully.",
        data={
            "tokens": TokenResponse(
                access_token=access_token,
                refresh_token=new_refresh,
                expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            ).model_dump(),
        },
    )


# ═══════════════════════════════════════════════════════════════
# POST /logout
# ═══════════════════════════════════════════════════════════════

@router.post(
    "/logout",
    response_model=SuccessResponse,
    summary="Revoke a refresh token (log out)",
)
def logout(body: LogoutRequest, db: Session = Depends(get_db)):
    """
    Revoke the supplied refresh token.  Idempotent – succeeds even
    if the token has already been revoked.
    """
    auth_service.logout(db=db, raw_refresh_token=body.refresh_token)

    return SuccessResponse(message="Logged out successfully.")


# ═══════════════════════════════════════════════════════════════
# GET /me
# ═══════════════════════════════════════════════════════════════

@router.get(
    "/me",
    response_model=SuccessResponse,
    summary="Get current authenticated user profile",
    responses={
        401: {"description": "Not authenticated"},
    },
)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Return the profile of the currently authenticated user.

    Requires a valid access token in the ``Authorization`` header.
    """
    return SuccessResponse(
        message="User profile retrieved.",
        data={"user": UserResponse.model_validate(current_user).model_dump()},
    )
