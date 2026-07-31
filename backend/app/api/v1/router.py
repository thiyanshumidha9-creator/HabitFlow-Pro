"""
HabitFlow Pro – API v1 Router Aggregator.

Collects all domain routers and exposes a single ``api_v1_router``
that is mounted under ``/api/v1`` in ``main.py``.

To add a new domain:
    1. Create ``app/api/v1/<domain>/__init__.py`` and ``router.py``.
    2. Import and include the router below.
"""

from fastapi import APIRouter

from app.api.v1.auth.router import router as auth_router
from app.api.v1.health.router import router as health_router
from app.api.v1.habits.router import router as habits_router
from app.api.v1.journals.router import router as journals_router
from app.api.v1.analytics.router import router as analytics_router
from app.api.v1.calendar.router import router as calendar_router
from app.api.v1.profile.router import router as profile_router

api_v1_router = APIRouter(prefix="/api/v1")

# ── Register domain routers ───────────────────────────────────
api_v1_router.include_router(auth_router)
api_v1_router.include_router(health_router)
api_v1_router.include_router(habits_router)
api_v1_router.include_router(journals_router)
api_v1_router.include_router(analytics_router)
api_v1_router.include_router(calendar_router)
api_v1_router.include_router(profile_router)

