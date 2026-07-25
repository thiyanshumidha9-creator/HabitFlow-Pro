"""
HabitFlow Pro – FastAPI Application Entry Point.

Responsibilities:
    1. Create and configure the FastAPI application instance.
    2. Register middleware (CORS, GZip, request-ID).
    3. Mount the versioned API router.
    4. Register global exception handlers.
    5. Run database table creation on startup (dev convenience).

Run with:
    uvicorn app.main:app --reload
"""

import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_v1_router
from app.core.config import get_settings
from app.core.exceptions import HabitFlowError
from app.core.logging import get_logger, setup_logging
from app.database.session import create_tables

logger = get_logger(__name__)


# ═══════════════════════════════════════════════════════════════
# Lifespan – startup / shutdown hooks
# ═══════════════════════════════════════════════════════════════

@asynccontextmanager
async def lifespan(application: FastAPI):
    """
    Application lifespan events.

    Startup:
        - Initialise logging.
        - Create database tables (dev convenience; production uses Alembic).
    Shutdown:
        - Cleanup resources (future: close connection pools).
    """
    # ── Startup ────────────────────────────────────────────────
    setup_logging()
    settings = get_settings()

    logger.info(
        "app_startup",
        app=settings.APP_NAME,
        version=settings.APP_VERSION,
        env=settings.ENVIRONMENT,
    )

    create_tables()

    yield

    # ── Shutdown ───────────────────────────────────────────────
    logger.info("app_shutdown")


# ═══════════════════════════════════════════════════════════════
# Application Factory
# ═══════════════════════════════════════════════════════════════

def create_app() -> FastAPI:
    """
    Build and configure the FastAPI application.

    Returns:
        A fully-configured FastAPI instance.
    """
    settings = get_settings()

    application = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=(
            "HabitFlow Pro – Professional Offline-First Habit Tracking "
            "& Productivity Platform API."
        ),
        docs_url="/docs" if settings.is_development else None,
        redoc_url="/redoc" if settings.is_development else None,
        lifespan=lifespan,
    )

    # ── Middleware ─────────────────────────────────────────────
    _register_middleware(application, settings)

    # ── Routers ────────────────────────────────────────────────
    application.include_router(api_v1_router)

    # ── Exception Handlers ─────────────────────────────────────
    _register_exception_handlers(application)

    return application


# ═══════════════════════════════════════════════════════════════
# Middleware Registration
# ═══════════════════════════════════════════════════════════════

def _register_middleware(application: FastAPI, settings) -> None:
    """Attach all middleware in the correct order."""

    # CORS – restricts cross-origin requests to allowed origins.
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # GZip – compress responses larger than 1 KB.
    application.add_middleware(GZipMiddleware, minimum_size=1000)

    # Request-ID – attach a unique ID to every request for tracing.
    @application.middleware("http")
    async def request_id_middleware(request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


# ═══════════════════════════════════════════════════════════════
# Global Exception Handlers
# ═══════════════════════════════════════════════════════════════

def _register_exception_handlers(application: FastAPI) -> None:
    """Map exception types to standardised JSON error responses."""

    @application.exception_handler(HabitFlowError)
    async def habitflow_error_handler(_request: Request, exc: HabitFlowError):
        """Handle all domain-specific HabitFlow exceptions."""
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "message": exc.message,
                "errors": exc.errors,
            },
        )

    @application.exception_handler(RequestValidationError)
    async def validation_error_handler(_request: Request, exc: RequestValidationError):
        """
        Convert Pydantic / FastAPI validation errors into our
        standard error envelope format.
        """
        errors = []
        for error in exc.errors():
            field = " → ".join(str(loc) for loc in error.get("loc", []))
            errors.append({
                "field": field,
                "message": error.get("msg", "Invalid value."),
            })

        return JSONResponse(
            status_code=422,
            content={
                "success": False,
                "message": "Validation failed.",
                "errors": errors,
            },
        )

    @application.exception_handler(Exception)
    async def unhandled_error_handler(_request: Request, exc: Exception):
        """
        Catch-all for unexpected errors.

        Logs the full traceback and returns a generic 500 response
        (never leak internal details to the client).
        """
        logger.error("unhandled_exception", error=str(exc), exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "An internal server error occurred.",
                "errors": [],
            },
        )


# ═══════════════════════════════════════════════════════════════
# Create the app instance used by Uvicorn
# ═══════════════════════════════════════════════════════════════

app = create_app()
