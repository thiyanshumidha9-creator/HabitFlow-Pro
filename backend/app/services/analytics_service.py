"""Shared analytics calculations for HabitFlow Pro."""
from collections import Counter, defaultdict
from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.models.habit import Habit
from app.models.habit_log import HabitLog
from app.models.journal import Journal

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def _pct(value: int, possible: int) -> float:
    return round(min(100.0, value * 100 / possible), 1) if possible else 0.0


def _period_rate(habits: list[Habit], logs: list[HabitLog], start: date, end: date) -> float:
    possible = sum(max(0, (end - max(start, habit.start_date)).days + 1) for habit in habits)
    completed = sum(start <= log.completed_date <= end for log in logs)
    return _pct(completed, possible)


def _streaks(logs: list[HabitLog], today: date) -> tuple[int, int, list[dict]]:
    dates = sorted({log.completed_date for log in logs})
    longest = current = run = 0
    previous = None
    for completed in dates:
        run = run + 1 if previous and completed == previous + timedelta(days=1) else 1
        longest = max(longest, run)
        previous = completed
    if dates and dates[-1] in (today, today - timedelta(days=1)):
        cursor = dates[-1]
        date_set = set(dates)
        while cursor in date_set:
            current += 1
            cursor -= timedelta(days=1)
    start = today - timedelta(days=29)
    progress = [{"date": (start + timedelta(days=i)).isoformat(), "streak": 0} for i in range(30)]
    run = 0
    date_set = set(dates)
    for item in progress:
        day = date.fromisoformat(item["date"])
        run = run + 1 if day in date_set else 0
        item["streak"] = run
    return current, longest, progress


def build_analytics(db: Session, user_id: str, today: date | None = None) -> dict:
    today = today or date.today()
    habits = db.query(Habit).filter(Habit.user_id == user_id).all()
    logs = db.query(HabitLog).filter(HabitLog.user_id == user_id).all()
    journals = db.query(Journal).filter(Journal.user_id == user_id).all()
    active = [habit for habit in habits if habit.start_date <= today]
    log_dates = {log.completed_date for log in logs}
    current_streak, longest_streak, streak_progress = _streaks(logs, today)

    week_start = today - timedelta(days=6)
    month_start = today.replace(day=1)
    weekly_rate = _period_rate(active, logs, week_start, today)
    monthly_rate = _period_rate(active, logs, month_start, today)
    completed_today = sum(log.completed_date == today for log in logs)
    today_rate = _pct(completed_today, len(active))
    journal_days = {journal.entry_date for journal in journals if month_start <= journal.entry_date <= today}
    journal_consistency = _pct(len(journal_days), (today - month_start).days + 1)
    productivity = round(weekly_rate * .4 + monthly_rate * .3 + today_rate * .2 + journal_consistency * .1, 1)

    weekly = []
    journal_activity = []
    for offset in range(6, -1, -1):
        day = today - timedelta(days=offset)
        weekly.append({"date": day.isoformat(), "day": day.strftime("%a"), "completions": sum(log.completed_date == day for log in logs)})
        journal_activity.append({"date": day.isoformat(), "day": day.strftime("%a"), "entries": sum(j.entry_date == day for j in journals)})

    monthly = []
    for index in range((today - month_start).days + 1):
        day = month_start + timedelta(days=index)
        completed = sum(log.completed_date == day for log in logs)
        eligible = sum(h.start_date <= day for h in active)
        monthly.append({"date": day.isoformat(), "day": day.day, "completions": completed, "percentage": _pct(completed, eligible)})

    categories = Counter((habit.category or "Other").title() for habit in habits)
    habit_counts = Counter(log.habit_id for log in logs)
    ranked = sorted(habits, key=lambda h: habit_counts[h.id], reverse=True)
    weekday_counts = Counter(log.completed_date.weekday() for log in logs)
    productive_index = max(weekday_counts, key=weekday_counts.get) if weekday_counts else None

    inactive = longest_inactive = 0
    cursor = min((h.start_date for h in habits), default=today)
    while cursor <= today:
        if cursor not in log_dates:
            inactive += 1
            longest_inactive = max(longest_inactive, inactive)
        else:
            inactive = 0
        cursor += timedelta(days=1)

    daily_rates = []
    cursor = min((h.start_date for h in active), default=today)
    while cursor <= today:
        eligible = sum(h.start_date <= cursor for h in active)
        daily_rates.append(_pct(sum(log.completed_date == cursor for log in logs), eligible))
        cursor += timedelta(days=1)
    average_rate = round(sum(daily_rates) / len(daily_rates), 1) if daily_rates else 0.0

    complete_days = set()
    for day in log_dates:
        eligible_ids = {h.id for h in active if h.start_date <= day}
        completed_ids = {log.habit_id for log in logs if log.completed_date == day}
        if eligible_ids and eligible_ids <= completed_ids:
            complete_days.add(day)
    complete_day_streak = 0
    cursor = today if today in complete_days else today - timedelta(days=1)
    while cursor in complete_days:
        complete_day_streak += 1
        cursor -= timedelta(days=1)

    metrics = {
        "total_habits": len(habits), "max_streak": longest_streak,
        "total_completions": len(logs), "total_journals": len(journals),
        "complete_day_streak": complete_day_streak, "productivity_score": productivity,
    }
    definitions = [
        ("first_habit", "First Habit", "Create your first habit", "trophy", "total_habits", 1),
        ("streak_7", "7 Day Streak", "Build a 7 day activity streak", "flame", "max_streak", 7),
        ("streak_30", "30 Day Streak", "Build a 30 day activity streak", "medal", "max_streak", 30),
        ("completions_100", "100 Habit Completions", "Complete habits 100 times", "badge-check", "total_completions", 100),
        ("first_journal", "First Journal Entry", "Write your first journal entry", "book-open", "total_journals", 1),
        ("journals_10", "10 Journal Entries", "Write 10 journal entries", "pen-tool", "total_journals", 10),
        ("perfect_week", "Perfect Week", "Complete all habits 7 days in a row", "calendar-check", "complete_day_streak", 7),
        ("score_90", "Productivity Star", "Reach a productivity score above 90", "star", "productivity_score", 90),
    ]
    achievements = []
    first_habit_date = min((h.created_at.date() for h in habits), default=None)
    first_journal_date = min((j.entry_date for j in journals), default=None)
    for ident, title, description, icon, metric, threshold in definitions:
        value = metrics[metric]
        unlocked = value >= threshold
        unlock_date = None
        if unlocked:
            if ident == "first_habit": unlock_date = first_habit_date
            elif ident == "first_journal": unlock_date = first_journal_date
            else: unlock_date = today
        achievements.append({"id": ident, "title": title, "description": description, "icon": icon, "unlocked": unlocked, "progress": min(value, threshold), "threshold": threshold, "progress_percentage": _pct(min(value, threshold), threshold), "unlock_date": unlock_date.isoformat() if unlock_date else None})

    recent = ([{"type": "habit", "title": next((h.name for h in habits if h.id == log.habit_id), "Habit completed"), "date": log.completed_date.isoformat()} for log in logs] +
              [{"type": "journal", "title": journal.title, "date": journal.entry_date.isoformat()} for journal in journals])
    recent.sort(key=lambda item: item["date"], reverse=True)

    summary = {"total_habits": len(habits), "active_habits": len(active), "completed_today": completed_today,
               "weekly_completion_pct": weekly_rate, "monthly_completion_pct": monthly_rate,
               "completion_rate": average_rate, "current_streak": current_streak, "longest_streak": longest_streak,
               "productivity_score": productivity, "total_journal_entries": len(journals),
               "journal_consistency_pct": journal_consistency}
    insights = {"most_productive_weekday": DAY_NAMES[productive_index] if productive_index is not None else "No data yet",
                "most_completed_habit": ranked[0].name if ranked and habit_counts[ranked[0].id] else "No data yet",
                "least_completed_habit": ranked[-1].name if ranked else "No data yet", "average_completion_rate": average_rate,
                "weekly_consistency": _pct(len({l.completed_date for l in logs if week_start <= l.completed_date <= today}), 7),
                "monthly_consistency": _pct(len({l.completed_date for l in logs if month_start <= l.completed_date <= today}), (today-month_start).days+1),
                "journal_writing_frequency": round(len(journals) / max(1, (today-month_start).days+1), 2),
                "best_streak": longest_streak, "longest_inactive_period": longest_inactive}
    return {"summary": summary, "weekly": weekly, "monthly": monthly,
            "categories": [{"category": key, "count": value} for key, value in categories.items()],
            "journal_activity": journal_activity, "streak_progress": streak_progress,
            "achievements": achievements, "insights": insights, "recent_activity": recent[:8],
            "today_habits": [{"id": h.id, "name": h.name, "completed": any(l.habit_id == h.id and l.completed_date == today for l in logs), "streak": h.streak} for h in active],
            "today_journal": next(({"id": j.id, "title": j.title, "mood": j.mood} for j in journals if j.entry_date == today), None),
            "upcoming_habits": [{"id": h.id, "name": h.name, "start_date": h.start_date.isoformat()} for h in habits if today < h.start_date <= today + timedelta(days=7)]}
