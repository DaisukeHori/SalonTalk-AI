"""
Health check routes
"""

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "pyannote-diarization"}


@router.get("/ready")
async def readiness_check():
    """Readiness check endpoint."""
    from app.main import pyannote_service

    if pyannote_service is None or not pyannote_service.is_ready:
        return {"status": "not_ready", "reason": "Model not loaded"}

    return {"status": "ready"}
