"""Tests for Sprint 5 analytics endpoints."""
from datetime import date, timedelta

from app.core.security import create_access_token, hash_password
from app.models.habit import Habit
from app.models.habit_log import HabitLog
from app.models.journal import Journal
from app.models.user import User


def _auth(db):
    user = User(email="analytics@example.com", full_name="Analytics User", password_hash=hash_password("Str0ngP@ssword"))
    db.add(user); db.commit(); db.refresh(user)
    return user, {"Authorization": f"Bearer {create_access_token(subject=user.id)}"}


def test_empty_analytics_are_safe(client, db_session):
    _, headers = _auth(db_session)
    response = client.get("/api/v1/analytics/overview", headers=headers)
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["summary"]["total_habits"] == 0
    assert data["summary"]["productivity_score"] == 0
    assert len(data["achievements"]) == 8


def test_dashboard_and_achievements_use_real_data(client, db_session):
    user, headers = _auth(db_session)
    today = date.today()
    habit = Habit(user_id=user.id, name="Exercise", category="health", frequency="Daily", start_date=today-timedelta(days=7), streak=2, completions_count=2)
    db_session.add(habit); db_session.flush()
    db_session.add_all([HabitLog(habit_id=habit.id, user_id=user.id, completed_date=today-timedelta(days=1)), HabitLog(habit_id=habit.id, user_id=user.id, completed_date=today)])
    db_session.add(Journal(user_id=user.id, title="Reflection", content="Good day", entry_date=today))
    db_session.commit()

    dashboard = client.get("/api/v1/dashboard/summary", headers=headers).json()["data"]
    assert dashboard["summary"]["completed_today"] == 1
    assert dashboard["summary"]["current_streak"] == 2
    assert dashboard["today_journal"]["title"] == "Reflection"
    achievements = client.get("/api/v1/analytics/achievements", headers=headers).json()["data"]
    unlocked = {item["id"] for item in achievements["achievements"] if item["unlocked"]}
    assert {"first_habit", "first_journal"} <= unlocked
    assert all("progress_percentage" in item and "unlock_date" in item for item in achievements["achievements"])


def test_analytics_requires_authentication(client):
    assert client.get("/api/v1/analytics/summary").status_code == 401
    assert client.get("/api/v1/dashboard/summary").status_code == 401
