# HabitFlow Pro – Backend API

Production-grade **FastAPI** backend for the HabitFlow Pro habit tracking platform.

---

## Tech Stack

| Layer          | Technology                        |
|----------------|-----------------------------------|
| Framework      | FastAPI 0.115+                    |
| Language       | Python 3.12                       |
| Database       | SQLite (dev) → PostgreSQL (prod)  |
| ORM            | SQLAlchemy 2.0                    |
| Migrations     | Alembic                           |
| Auth           | JWT (PyJWT) + Argon2id (passlib)  |
| Validation     | Pydantic 2.10                     |
| Logging        | structlog                         |
| Server         | Uvicorn                           |

---

## Project Structure

```
backend/
├── alembic/                   # Database migration scripts
│   ├── versions/              # Auto-generated migration files
│   ├── env.py                 # Alembic environment config
│   └── script.py.mako         # Migration file template
├── app/
│   ├── api/                   # API route handlers
│   │   └── v1/                # Version 1 endpoints
│   │       ├── auth/          #   Authentication (signup, login, refresh, logout)
│   │       └── health/        #   Health check
│   ├── core/                  # App-wide infrastructure
│   │   ├── config.py          #   Settings (env vars)
│   │   ├── deps.py            #   FastAPI dependencies (get_db, get_current_user)
│   │   ├── exceptions.py      #   Custom exception hierarchy
│   │   ├── logging.py         #   Structured logging setup
│   │   └── security.py        #   Password hashing & JWT utilities
│   ├── database/              # Database engine & session
│   │   └── session.py
│   ├── models/                # SQLAlchemy ORM models
│   │   ├── base.py            #   Declarative base + mixins
│   │   └── user.py            #   User + RefreshToken tables
│   ├── schemas/               # Pydantic request/response models
│   │   ├── auth.py
│   │   ├── common.py          #   Standard response envelopes
│   │   └── user.py
│   ├── services/              # Business logic
│   │   └── auth_service.py
│   └── main.py                # FastAPI application entry point
├── tests/                     # Pytest test suite
│   ├── conftest.py            #   Fixtures (in-memory DB, TestClient)
│   └── test_auth.py           #   Auth endpoint tests
├── .env                       # Local environment variables (git-ignored)
├── .env.example               # Template for .env
├── .gitignore
├── alembic.ini                # Alembic configuration
└── pyproject.toml             # Project dependencies & tooling
```

---

## Quick Start

### 1. Prerequisites

- **Python 3.12+** installed
- **pip** (or **uv** for faster installs)

### 2. Clone & Setup

```bash
cd "Habit Tracker/backend"

# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\activate

# Activate (macOS / Linux)
source venv/bin/activate

# Install dependencies
pip install -e ".[dev]"
```

### 3. Configure Environment

```bash
# The repo ships with a working .env for development.
# To customise, edit .env or copy from the template:
cp .env.example .env
```

### 4. Run the Server

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The API is now live at **http://127.0.0.1:8000**

### 5. Explore the API Docs

| URL                              | Description     |
|----------------------------------|-----------------|
| http://127.0.0.1:8000/docs      | Swagger UI      |
| http://127.0.0.1:8000/redoc     | ReDoc           |
| http://127.0.0.1:8000/api/v1/health | Health check |

---

## Database Migrations (Alembic)

```bash
# Generate a new migration after model changes
alembic revision --autogenerate -m "describe your change"

# Apply all pending migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1
```

> **Note:** During development the app auto-creates tables on startup
> via `create_tables()`. Use Alembic for production.

---

## Running Tests

```bash
# Run the full test suite
pytest -v

# Run with coverage
pytest --cov=app --cov-report=term-missing
```

---

## API Response Format

Every endpoint returns a consistent envelope:

**Success (200/201)**
```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": { ... }
}
```

**Error (4xx/5xx)**
```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": [
    { "field": "email", "message": "Email is already registered." }
  ]
}
```

---

## Authentication Flow

1. **Signup** → `POST /api/v1/auth/signup` → returns `access_token` + `refresh_token`
2. **Login** → `POST /api/v1/auth/login` → returns tokens
3. **Access API** → pass `Authorization: Bearer <access_token>` header
4. **Refresh** → `POST /api/v1/auth/refresh` → rotates tokens (old refresh is revoked)
5. **Logout** → `POST /api/v1/auth/logout` → revokes the refresh token

---

## Environment Variables

All prefixed with `HF_`. See `.env.example` for the complete list.

| Variable                        | Default           | Description                     |
|---------------------------------|-------------------|---------------------------------|
| `HF_DATABASE_URL`              | `sqlite:///./habitflow.db` | Database connection string |
| `HF_JWT_SECRET_KEY`            | (must set)        | Secret for signing JWTs         |
| `HF_ACCESS_TOKEN_EXPIRE_MINUTES` | `15`            | Access token lifetime           |
| `HF_REFRESH_TOKEN_EXPIRE_DAYS` | `30`             | Refresh token lifetime          |
| `HF_ALLOWED_ORIGINS`           | `http://localhost:3000` | CORS allowed origins       |
| `HF_LOG_LEVEL`                 | `INFO`            | Logging level                   |
| `HF_ENVIRONMENT`               | `production`      | `development` / `staging` / `production` |

---

## License

MIT
