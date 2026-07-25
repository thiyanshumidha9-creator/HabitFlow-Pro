"""
HabitFlow Pro – Common Response Schemas.

Defines the standard API response envelope used by every endpoint:

    Success → { "success": true,  "message": "…", "data": {…} }
    Error   → { "success": false, "message": "…", "errors": [{…}] }
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    """
    A single field-level error entry inside the ``errors`` array.

    Attributes:
        field:   The request field that failed validation (optional).
        message: Human-readable explanation of the error.
    """

    field: Optional[str] = Field(None, examples=["email"])
    message: str = Field(..., examples=["Email is already registered."])


class SuccessResponse(BaseModel):
    """
    Standard success envelope.

    Attributes:
        success: Always ``True``.
        message: Brief human-readable status.
        data:    Payload (any JSON-serialisable object).
    """

    success: bool = Field(True, examples=[True])
    message: str = Field("Operation completed successfully.", examples=["Habit created."])
    data: Optional[Dict[str, Any] | List[Any]] = Field(None)


class ErrorResponse(BaseModel):
    """
    Standard error envelope.

    Attributes:
        success: Always ``False``.
        message: Brief human-readable error summary.
        errors:  List of granular error details.
    """

    success: bool = Field(False, examples=[False])
    message: str = Field("An error occurred.", examples=["Validation failed."])
    errors: List[ErrorDetail] = Field(default_factory=list)
