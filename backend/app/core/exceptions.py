"""
HabitFlow Pro – Custom Exception Hierarchy.

All domain-specific exceptions inherit from ``HabitFlowError``.
FastAPI exception handlers in ``main.py`` catch these and return
the standard error response envelope.

Hierarchy:
    HabitFlowError
    ├── AuthenticationError   (401)
    ├── AuthorizationError    (403)
    ├── NotFoundError         (404)
    ├── ConflictError         (409)
    ├── ValidationError       (422)
    └── RateLimitError        (429)
"""

from typing import Any, Dict, List, Optional


class HabitFlowError(Exception):
    """
    Base exception for all HabitFlow Pro domain errors.

    Attributes:
        message:     Human-readable error description.
        status_code: HTTP status code to return.
        errors:      Optional list of field-level error details.
    """

    def __init__(
        self,
        message: str = "An unexpected error occurred.",
        status_code: int = 500,
        errors: Optional[List[Dict[str, Any]]] = None,
    ) -> None:
        self.message = message
        self.status_code = status_code
        self.errors = errors or []
        super().__init__(self.message)


class AuthenticationError(HabitFlowError):
    """Raised when authentication credentials are invalid or missing."""

    def __init__(
        self,
        message: str = "Invalid or missing authentication credentials.",
        errors: Optional[List[Dict[str, Any]]] = None,
    ) -> None:
        super().__init__(message=message, status_code=401, errors=errors)


class AuthorizationError(HabitFlowError):
    """Raised when the user lacks permission for the requested resource."""

    def __init__(
        self,
        message: str = "You do not have permission to perform this action.",
        errors: Optional[List[Dict[str, Any]]] = None,
    ) -> None:
        super().__init__(message=message, status_code=403, errors=errors)


class NotFoundError(HabitFlowError):
    """Raised when a requested resource does not exist."""

    def __init__(
        self,
        message: str = "The requested resource was not found.",
        errors: Optional[List[Dict[str, Any]]] = None,
    ) -> None:
        super().__init__(message=message, status_code=404, errors=errors)


class ConflictError(HabitFlowError):
    """Raised when a write operation conflicts with existing state (e.g. duplicate)."""

    def __init__(
        self,
        message: str = "A resource with the given identifier already exists.",
        errors: Optional[List[Dict[str, Any]]] = None,
    ) -> None:
        super().__init__(message=message, status_code=409, errors=errors)


class ValidationError(HabitFlowError):
    """Raised when request data fails business-level validation."""

    def __init__(
        self,
        message: str = "Validation failed.",
        errors: Optional[List[Dict[str, Any]]] = None,
    ) -> None:
        super().__init__(message=message, status_code=422, errors=errors)


class RateLimitError(HabitFlowError):
    """Raised when a client exceeds the rate limit."""

    def __init__(
        self,
        message: str = "Too many requests. Please try again later.",
        errors: Optional[List[Dict[str, Any]]] = None,
    ) -> None:
        super().__init__(message=message, status_code=429, errors=errors)
