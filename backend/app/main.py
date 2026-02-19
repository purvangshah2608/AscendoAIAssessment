from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
import logging

from app.core.config import settings
from app.api.v1.router import api_router
from app.database import engine
from app.models.base import Base

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title="Ascendo AI - Project Management API",
    description="A production-grade project management API built for Ascendo AI assessment",
    version="1.0.0",
    lifespan=lifespan
)


# Custom validation error handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Log and return detailed validation errors."""
    errors = exc.errors()
    logger.error(f"Validation error on {request.method} {request.url.path}")
    logger.error(f"Errors: {errors}")

    return JSONResponse(
        status_code=422,
        content={"detail": errors}
    )


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Ascendo AI API"}


@app.get("/")
async def root():
    return {
        "message": "Welcome to Ascendo AI Project Management API",
        "docs": "/docs",
        "health": "/health"
    }