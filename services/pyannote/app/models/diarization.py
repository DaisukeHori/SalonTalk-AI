"""
Diarization models
"""

from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class DiarizationRequest(BaseModel):
    """Request model for diarization endpoint."""

    session_id: str = Field(..., description="Session identifier")
    chunk_index: int = Field(..., ge=0, description="Chunk index within the session")
    callback_url: Optional[str] = Field(None, description="Webhook URL for async processing")


class DiarizationSegment(BaseModel):
    """A single speaker segment."""

    speaker: str = Field(..., description="Speaker identifier (SPEAKER_00, SPEAKER_01, etc.)")
    start_time_ms: int = Field(..., ge=0, description="Start time in milliseconds")
    end_time_ms: int = Field(..., ge=0, description="End time in milliseconds")


class DiarizationResponse(BaseModel):
    """Response model for diarization endpoint."""

    session_id: str
    chunk_index: int
    segments: List[DiarizationSegment]
    processing_time_ms: int = Field(..., ge=0, description="Processing time in milliseconds")
    status: Literal["processing", "completed", "error"] = "completed"


class DiarizationCallbackPayload(BaseModel):
    """Payload sent to callback URL."""

    session_id: str
    chunk_index: int
    success: bool
    result: Optional[DiarizationResponse] = None
    error: Optional[str] = None
