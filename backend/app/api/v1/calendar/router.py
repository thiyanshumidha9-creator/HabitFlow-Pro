"""
HabitFlow Pro – Calendar API Router.

Provides monthly summary and per-day activity for the calendar module.
"""

from calendar import monthrange
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.habit import Habit
from app.models.habit_log import HabitLog
from app.models.journal import Journal
from app.models.user import User
from app.schemas.common import SuccessResponse

router = APIRouter(prefix="/calendar", tags=["Calendar"])


def _month_date_range(year: int, month: int) -> tuple[date, date]:
    """Return the first and last date of a calendar month."""
    last_day = monthrange(year, month)[1]
    return date(year, month, 1), date(year, month, last_day)


@router.get(
    "/summary",
    response_model=SuccessResponse,
    summary="Monthly calendar activity summary",
)
def get_calendar_summary(
    year: int = Query(..., ge=2000, le=2100, description="Calendar year"),
    month: int = Query(..., ge=1, le=12, description="Calendar month (1-12)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return per-day activity counts for a given month:
    habit completions, journal entries, and whether the day has any activity.
    """
    month_start, month_end = _month_date_range(year, month)
    today = date.today()

    log_rows = (
        db.query(HabitLog.completed_date, func.count(HabitLog.id))
        .filter(
            HabitLog.user_id == current_user.id,
            HabitLog.completed_date >= month_start,
            HabitLog.completed_date <= month_end,
        )
        .group_by(HabitLog.completed_date)
        .all()
    )
    habit_counts = {row[0].isoformat(): row[1] for row in log_rows}

    journal_rows = (
        db.query(Journal.entry_date, func.count(Journal.id))
        .filter(
            Journal.user_id == current_user.id,
            Journal.entry_date >= month_start,
            Journal.entry_date <= month_end,
        )
        .group_by(Journal.entry_date)
        .all()
    )
    journal_counts = {row[0].isoformat(): row[1] for row in journal_rows}

    # Include today's in-progress completions not yet persisted as logs
    if month_start <= today <= month_end:
        today_str = today.isoformat()
        habits = db.query(Habit).filter(Habit.user_id == current_user.id).all()
        for habit in habits:
            if not habit.is_completed_today:
                continue
            has_log = (
                db.query(HabitLog)
                .filter(
                    HabitLog.habit_id == habit.id,
                    HabitLog.completed_date == today,
                )
                .first()
            )
            if not has_log:
                habit_counts[today_str] = habit_counts.get(today_str, 0) + 1

    days = []
    current = month_start
    while current <= month_end:
        d_str = current.isoformat()
        h_count = habit_counts.get(d_str, 0)
        j_count = journal_counts.get(d_str, 0)
        days.append({
            "date": d_str,
            "habit_completions": h_count,
            "journal_entries": j_count,
            "has_habits": h_count > 0,
            "has_journal": j_count > 0,
            "has_activity": h_count > 0 or j_count > 0,
            "is_today": current == today,
        })
        current = date.fromordinal(current.toordinal() + 1)

    return SuccessResponse(
        message="Calendar summary retrieved successfully.",
        data={
            "year": year,
            "month": month,
            "days": days,
        },
    )


@router.get(
    "/daily-activity",
    response_model=SuccessResponse,
    summary="Detailed activity for a specific date",
)
def get_daily_activity(
    activity_date: date = Query(..., alias="date", description="Date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return completed habits, journal entries, streak, and completion
    percentage for a single calendar day.
    """
    habits = db.query(Habit).filter(Habit.user_id == current_user.id).all()
    active_habits = [h for h in habits if h.start_date <= activity_date]
    total_habits = len(active_habits)

    logs = (
        db.query(HabitLog)
        .filter(
            HabitLog.user_id == current_user.id,
            HabitLog.completed_date == activity_date,
        )
        .all()
    )
    completed_habit_ids = {log.habit_id for log in logs}

    today = date.today()
    if activity_date == today:
        for habit in active_habits:
            if habit.is_completed_today:
                completed_habit_ids.add(habit.id)

    completed_habits = [
        {
            "id": habit.id,
            "name": habit.name,
            "category": habit.category,
            "streak": habit.streak,
        }
        for habit in active_habits
        if habit.id in completed_habit_ids
    ]

    journal_entries = (
        db.query(Journal)
        .filter(
            Journal.user_id == current_user.id,
            Journal.entry_date == activity_date,
        )
        .order_by(Journal.created_at.desc())
        .all()
    )

    journals_data = [
        {
            "id": j.id,
            "title": j.title,
            "content": j.content,
            "mood": j.mood,
            "tags": j.tags,
            "entry_date": j.entry_date.isoformat(),
        }
        for j in journal_entries
    ]

    completed_count = len(completed_habits)
    completion_pct = (
        round((completed_count / total_habits) * 100, 1) if total_habits > 0 else 0.0
    )
    current_streak = max((h.streak for h in habits), default=0)

    return SuccessResponse(
        message="Daily activity retrieved successfully.",
        data={
            "date": activity_date.isoformat(),
            "completed_habits": completed_habits,
            "journal_entries": journals_data,
            "completed_count": completed_count,
            "total_habits": total_habits,
            "completion_percentage": completion_pct,
            "current_streak": current_streak,
            "longest_streak": current_streak,
        },
    )
