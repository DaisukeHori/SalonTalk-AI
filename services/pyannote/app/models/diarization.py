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


# ============================================================
# 声紋埋め込み関連モデル
# ============================================================

class EmbeddingResponse(BaseModel):
    """Response model for embedding extraction endpoint."""

    embedding: List[float] = Field(..., description="512-dimensional speaker embedding vector")
    duration_seconds: float = Field(..., ge=0, description="Audio duration in seconds")
    confidence: float = Field(
        ..., ge=0, le=1, description="Confidence score of the embedding quality"
    )
    processing_time_ms: int = Field(..., ge=0, description="Processing time in milliseconds")


class EmbeddingRequest(BaseModel):
    """Request model for embedding extraction (for JSON body, optional)."""

    session_id: Optional[str] = Field(None, description="Session identifier for tracking")
    speaker_label: Optional[str] = Field(
        None, description="Specific speaker to extract embedding for (e.g., 'customer')"
    )
