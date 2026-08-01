"""
HabitFlow Pro – User Response Schema.

Returned whenever the API needs to expose user profile data.
Sensitive fields (password_hash) are excluded.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class UserResponse(BaseModel):
    """
    Public representation of a user account.

    Never includes ``password_hash``.
    """

    id: str = Field(..., description="UUID.", examples=["a1b2c3d4-…"])
    email: EmailStr
    full_name: str
    role: str = Field("user", examples=["user", "admin"])
    is_active: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    phone: Optional[str] = None
    avatar: Optional[str] = None

    model_config = {"from_attributes": True}
