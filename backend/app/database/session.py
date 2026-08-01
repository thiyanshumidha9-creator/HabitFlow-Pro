"""
HabitFlow Pro – Database Session Management.

Provides:
    - SQLAlchemy engine & session factory
    - ``get_db`` dependency for FastAPI route injection
    - ``create_tables`` helper for initial setup (development only)

SQLite is the current backend; the abstraction layer supports a future
migration to PostgreSQL by changing only ``HF_DATABASE_URL``.
"""

from typing import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)

settings = get_settings()

# ── Engine Creation ────────────────────────────────────────────
# ``check_same_thread=False`` is required for SQLite when accessed
# from multiple threads (e.g. Uvicorn workers).  The parameter is
# ignored by non-SQLite dialects so it is safe to leave in place
# for a future PostgreSQL migration.
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
    echo=settings.DEBUG,
    pool_pre_ping=True,
)


# ── Enable WAL mode & foreign keys for SQLite ─────────────────
# WAL (Write-Ahead Logging) dramatically improves concurrent read
# performance.  Foreign key enforcement is OFF by default in SQLite
# and must be enabled per-connection.
if "sqlite" in settings.DATABASE_URL:
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragmas(dbapi_connection, _connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA foreign_keys=ON;")
        cursor.close()


# ── Session Factory ────────────────────────────────────────────
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


# ── FastAPI Dependency ─────────────────────────────────────────

def get_db() -> Generator[Session, None, None]:
    """
    Yield a database session scoped to a single request.

    The session is committed on success and rolled back on error,
    then always closed.  Inject with ``Depends(get_db)``.
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# ── Development Helper ─────────────────────────────────────────

def create_tables() -> None:
    """
    Create all tables defined by the ORM Base.

    **Development-only convenience** – production uses Alembic migrations.
    """
    from app.models.base import Base  # noqa: F811 – deferred import

    Base.metadata.create_all(bind=engine)

    # Automatically add phone and avatar columns to users table if they are missing (SQLite)
    from sqlalchemy import text
    with engine.begin() as conn:
        res = conn.execute(text("PRAGMA table_info(users)")).fetchall()
        columns = [row[1] for row in res]
        if "phone" not in columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN phone VARCHAR(30)"))
        if "avatar" not in columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN avatar TEXT"))

    logger.info("database_tables_created")
