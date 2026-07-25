"""
HabitFlow Pro – Authentication Schemas.

Request / response models for signup, login, token refresh, and logout.
"""

from pydantic import BaseModel, EmailStr, Field, field_validator


class SignupRequest(BaseModel):
    """
    POST /api/v1/auth/signup request body.

    Validations:
        - ``email`` must be a valid email address.
        - ``full_name`` must be 1–150 characters.
        - ``password`` must be 8–128 characters with at least one
          uppercase letter, one lowercase letter, and one digit.
    """

    email: EmailStr = Field(
        ...,
        description="User email address.",
        examples=["user@example.com"],
    )
    full_name: str = Field(
        ...,
        min_length=1,
        max_length=150,
        description="Display name.",
        examples=["John Doe"],
    )
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Account password (8-128 chars, mixed case + digit).",
        examples=["MyStr0ngP@ss"],
    )

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        """Enforce minimum password complexity."""
        if not any(c.isupper() for c in value):
            raise ValueError("Password must contain at least one uppercase letter.")
        if not any(c.islower() for c in value):
            raise ValueError("Password must contain at least one lowercase letter.")
        if not any(c.isdigit() for c in value):
            raise ValueError("Password must contain at least one digit.")
        return value


class LoginRequest(BaseModel):
    """
    POST /api/v1/auth/login request body.
    """

    email: EmailStr = Field(
        ...,
        description="Registered email address.",
        examples=["user@example.com"],
    )
    password: str = Field(
        ...,
        min_length=1,
        description="Account password.",
        examples=["MyStr0ngP@ss"],
    )
    device_id: str = Field(
        default="web",
        max_length=64,
        description="Client-generated device identifier for token binding.",
        examples=["550e8400-e29b-41d4-a716-446655440000"],
    )


class RefreshRequest(BaseModel):
    """
    POST /api/v1/auth/refresh request body.
    """

    refresh_token: str = Field(
        ...,
        description="The current refresh JWT.",
    )
    device_id: str = Field(
        default="web",
        max_length=64,
        description="Must match the device_id used during login.",
    )


class LogoutRequest(BaseModel):
    """
    POST /api/v1/auth/logout request body.
    """

    refresh_token: str = Field(
        ...,
        description="The refresh JWT to revoke.",
    )


class TokenResponse(BaseModel):
    """
    Token payload returned on signup, login, and refresh.

    Attributes:
        access_token:  Short-lived JWT for API authorization.
        refresh_token: Long-lived JWT for obtaining new access tokens.
        token_type:    Always ``"bearer"``.
        expires_in:    Access-token lifetime in seconds.
    """

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = Field(
        description="Access token lifetime in seconds.",
        examples=[900],
    )
