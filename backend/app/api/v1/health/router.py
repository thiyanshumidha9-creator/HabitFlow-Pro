"""
HabitFlow Pro – Health-Check Route.

Provides a simple ``/health`` endpoint used by load balancers,
monitoring systems, and CI pipelines to verify the service is
running and the database is reachable.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.deps import get_db

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    summary="Service health check",
    response_model=dict,
)
def health_check(db: Session = Depends(get_db)):
    """
    Return the service status, version, environment, and database
    connectivity.

    Returns ``200`` with ``"status": "healthy"`` when everything is OK.
    If the database query fails, the standard error handler catches
    the exception and returns ``500``.
    """
    settings = get_settings()

    # ── Quick DB connectivity probe ────────────────────────────
    db.execute(text("SELECT 1"))

    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
