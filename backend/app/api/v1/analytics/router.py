"""HabitFlow Pro analytics and dashboard endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.common import SuccessResponse
from app.services.analytics_service import build_analytics

router = APIRouter(tags=["Analytics"])


def _response(message: str, data):
    return SuccessResponse(message=message, data=data)


@router.get("/analytics/summary", response_model=SuccessResponse)
def summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return _response("Analytics summary retrieved successfully.", build_analytics(db, current_user.id)["summary"])


@router.get("/analytics/weekly", response_model=SuccessResponse)
def weekly(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return _response("Weekly analytics retrieved successfully.", build_analytics(db, current_user.id)["weekly"])


@router.get("/analytics/monthly", response_model=SuccessResponse)
def monthly(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return _response("Monthly analytics retrieved successfully.", build_analytics(db, current_user.id)["monthly"])


@router.get("/analytics/streaks", response_model=SuccessResponse)
def streaks(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    analytics = build_analytics(db, current_user.id)
    return _response("Streak analytics retrieved successfully.", {"current_streak": analytics["summary"]["current_streak"], "longest_streak": analytics["summary"]["longest_streak"], "progress": analytics["streak_progress"]})


@router.get("/analytics/achievements", response_model=SuccessResponse)
def achievements(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    items = build_analytics(db, current_user.id)["achievements"]
    return _response("Achievements retrieved successfully.", {"achievements": items, "unlocked_count": sum(a["unlocked"] for a in items), "total_count": len(items), "next_achievement": next((a for a in items if not a["unlocked"]), None)})


@router.get("/analytics/insights", response_model=SuccessResponse)
def insights(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return _response("Insights retrieved successfully.", build_analytics(db, current_user.id)["insights"])


@router.get("/analytics/categories", response_model=SuccessResponse)
def categories(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return _response("Category distribution retrieved successfully.", build_analytics(db, current_user.id)["categories"])


@router.get("/analytics/journals", response_model=SuccessResponse)
def journal_activity(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return _response("Journal activity retrieved successfully.", build_analytics(db, current_user.id)["journal_activity"])


@router.get("/analytics/overview", response_model=SuccessResponse)
def overview(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Single cache-friendly payload used by the analytics SPA page."""
    return _response("Analytics overview retrieved successfully.", build_analytics(db, current_user.id))


@router.get("/dashboard/summary", response_model=SuccessResponse)
def dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Single request for all dashboard intelligence widgets."""
    data = build_analytics(db, current_user.id)
    return _response("Dashboard summary retrieved successfully.", {key: data[key] for key in ("summary", "today_habits", "today_journal", "recent_activity", "upcoming_habits", "insights")})
