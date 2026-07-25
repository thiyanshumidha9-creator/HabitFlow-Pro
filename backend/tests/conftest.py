"""
HabitFlow Pro – Pytest Fixtures.

Provides:
    - An in-memory SQLite database for test isolation.
    - A FastAPI TestClient wired to the test database.
    - Helper factories for creating test users.

Key design decisions:
    1. ``StaticPool`` forces all SQLAlchemy connections to reuse a
       single underlying SQLite connection.  Without this, in-memory
       SQLite creates a *separate* empty database per connection.
    2. The production ``engine`` in ``db_module`` is monkey-patched so
       that the lifespan ``create_tables()`` call targets the test DB.
    3. ``get_db`` is overridden so route handlers receive the test session.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.database.session as db_module
from app.core.deps import get_db
from app.main import app
from app.models.base import Base


# ── In-Memory Test Database ────────────────────────────────────
# StaticPool ensures every .connect() reuses the exact same
# DBAPI connection, so CREATE TABLE in one place is visible to
# queries made elsewhere – critical for in-memory SQLite.
test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


@event.listens_for(test_engine, "connect")
def _set_sqlite_pragmas(dbapi_connection, _connection_record):
    """Enable foreign keys in the test database."""
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON;")
    cursor.close()


TestSession = sessionmaker(
    bind=test_engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


# ── Fixtures ───────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def setup_database():
    """
    Create all tables before each test, drop them after.

    Patches the production engine in ``db_module`` so that the
    lifespan ``create_tables()`` call also targets the test DB.
    """
    original_engine = db_module.engine
    db_module.engine = test_engine

    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)

    db_module.engine = original_engine


@pytest.fixture()
def db_session():
    """Yield a test database session and roll back on teardown."""
    session = TestSession()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture()
def client(db_session):
    """
    Return a FastAPI TestClient that uses the test database.

    Overrides the ``get_db`` dependency so all routes hit the
    in-memory SQLite instance.
    """

    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# ── Helper Data ────────────────────────────────────────────────

VALID_USER = {
    "email": "test@example.com",
    "full_name": "Test User",
    "password": "Str0ngP@ssword",
}

VALID_USER_2 = {
    "email": "jane@example.com",
    "full_name": "Jane Doe",
    "password": "An0therP@ss",
}
