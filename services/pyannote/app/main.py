"""
SalonTalk AI - Pyannote Speaker Diarization Server
FastAPI application for speaker diarization processing
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import diarization, health
from app.services.pyannote_service import PyannoteService

logger = structlog.get_logger()

# Global service instance
pyannote_service: PyannoteService | None = None


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan handler for startup and shutdown."""
    global pyannote_service

    # Startup
    logger.info("Starting pyannote server...")
    pyannote_service = PyannoteService()
    await pyannote_service.initialize()
    logger.info("Pyannote model loaded successfully")

    yield

    # Shutdown
    logger.info("Shutting down pyannote server...")
    if pyannote_service:
        await pyannote_service.cleanup()


app = FastAPI(
    title="SalonTalk AI - Speaker Diarization Server",
    description="Speaker diarization service using pyannote.audio",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, tags=["Health"])
app.include_router(diarization.router, prefix="/api/v1", tags=["Diarization"])


def get_pyannote_service() -> PyannoteService:
    """Get the global pyannote service instance."""
    if pyannote_service is None:
        raise RuntimeError("Pyannote service not initialized")
    return pyannote_service
