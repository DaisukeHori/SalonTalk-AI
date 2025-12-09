"""
Speaker diarization routes
"""

import os
import tempfile
from typing import Optional

import httpx
import structlog
from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile

from app.main import get_pyannote_service
from app.models.diarization import (
    DiarizationRequest,
    DiarizationResponse,
    DiarizationSegment,
    EmbeddingResponse,
    SpeakerEmbedding,
)

logger = structlog.get_logger()
router = APIRouter()


@router.post("/diarize", response_model=DiarizationResponse)
async def diarize_audio(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    session_id: str = Form(...),
    chunk_index: int = Form(...),
    callback_url: Optional[str] = Form(None),
    extract_embeddings: bool = Form(False),
):
    """
    Process audio file for speaker diarization.

    - **file**: Audio file (WAV, MP3, M4A)
    - **session_id**: Session identifier
    - **chunk_index**: Chunk index within the session
    - **callback_url**: Optional webhook URL for async processing
    - **extract_embeddings**: If true, extract speaker embeddings for voice identification
    """
    logger.info(
        "Received diarization request",
        session_id=session_id,
        chunk_index=chunk_index,
        filename=file.filename,
        extract_embeddings=extract_embeddings,
    )

    # Validate file type
    allowed_types = ["audio/wav", "audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/webm"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format: {file.content_type}",
        )

    # Save uploaded file temporarily
    suffix = os.path.splitext(file.filename or "audio.wav")[1]
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        service = get_pyannote_service()

        # If callback URL provided, process asynchronously
        if callback_url:
            background_tasks.add_task(
                process_and_callback,
                tmp_path,
                session_id,
                chunk_index,
                callback_url,
                extract_embeddings,
            )
            return DiarizationResponse(
                session_id=session_id,
                chunk_index=chunk_index,
                segments=[],
                processing_time_ms=0,
                status="processing",
            )

        # Synchronous processing
        if extract_embeddings:
            result = await service.diarize_with_embeddings(tmp_path)
        else:
            result = await service.diarize(tmp_path)

        segments = [
            DiarizationSegment(
                speaker=seg["speaker"],
                start_time_ms=int(seg["start"] * 1000),
                end_time_ms=int(seg["end"] * 1000),
            )
            for seg in result["segments"]
        ]

        speaker_embeddings = None
        if extract_embeddings and "speaker_embeddings" in result:
            speaker_embeddings = [
                SpeakerEmbedding(
                    label=emb["label"],
                    embedding=emb["embedding"],
                    duration_ms=emb["duration_ms"],
                )
                for emb in result["speaker_embeddings"]
            ]

        return DiarizationResponse(
            session_id=session_id,
            chunk_index=chunk_index,
            segments=segments,
            processing_time_ms=result["processing_time_ms"],
            status="completed",
            speaker_embeddings=speaker_embeddings,
        )

    finally:
        # Clean up temp file (if not async)
        if not callback_url and os.path.exists(tmp_path):
            os.unlink(tmp_path)


async def process_and_callback(
    audio_path: str,
    session_id: str,
    chunk_index: int,
    callback_url: str,
    extract_embeddings: bool = False,
):
    """Process audio and send result to callback URL."""
    try:
        service = get_pyannote_service()

        if extract_embeddings:
            result = await service.diarize_with_embeddings(audio_path)
        else:
            result = await service.diarize(audio_path)

        segments = [
            {
                "speaker": seg["speaker"],
                "start_time_ms": int(seg["start"] * 1000),
                "end_time_ms": int(seg["end"] * 1000),
            }
            for seg in result["segments"]
        ]

        callback_data = {
            "session_id": session_id,
            "chunk_index": chunk_index,
            "success": True,
            "result": {
                "segments": segments,
                "processing_time_ms": result["processing_time_ms"],
            },
        }

        # Add speaker embeddings if requested
        if extract_embeddings and "speaker_embeddings" in result:
            callback_data["result"]["speaker_embeddings"] = [
                {
                    "label": emb["label"],
                    "embedding": emb["embedding"],
                    "duration_ms": emb["duration_ms"],
                }
                for emb in result["speaker_embeddings"]
            ]

        async with httpx.AsyncClient() as client:
            response = await client.post(
                callback_url,
                json=callback_data,
                headers={"Content-Type": "application/json"},
                timeout=30.0,
            )
            response.raise_for_status()

        logger.info(
            "Callback sent successfully",
            session_id=session_id,
            chunk_index=chunk_index,
        )

    except Exception as e:
        logger.error(
            "Diarization failed",
            session_id=session_id,
            chunk_index=chunk_index,
            error=str(e),
        )

        # Send error callback
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    callback_url,
                    json={
                        "session_id": session_id,
                        "chunk_index": chunk_index,
                        "success": False,
                        "error": str(e),
                    },
                    timeout=30.0,
                )
        except Exception:
            logger.error("Failed to send error callback")

    finally:
        if os.path.exists(audio_path):
            os.unlink(audio_path)


@router.post("/extract-embedding", response_model=EmbeddingResponse)
async def extract_embedding(
    file: UploadFile = File(...),
    session_id: Optional[str] = Form(None),
    speaker_label: Optional[str] = Form(None),
):
    """
    Extract speaker embedding from an audio file.

    - **file**: Audio file (WAV, MP3, M4A)
    - **session_id**: Optional session identifier for tracking
    - **speaker_label**: Optional speaker to extract ('customer' or 'stylist')
                         If specified, will diarize and extract only that speaker

    Returns a 512-dimensional speaker embedding vector.
    """
    logger.info(
        "Received embedding extraction request",
        session_id=session_id,
        speaker_label=speaker_label,
        filename=file.filename,
    )

    # Validate file type
    allowed_types = ["audio/wav", "audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/webm"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format: {file.content_type}",
        )

    # Validate speaker_label if provided
    if speaker_label and speaker_label not in ["customer", "stylist"]:
        raise HTTPException(
            status_code=400,
            detail="speaker_label must be 'customer' or 'stylist'",
        )

    # Save uploaded file temporarily
    suffix = os.path.splitext(file.filename or "audio.wav")[1]
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        service = get_pyannote_service()
        result = await service.extract_embedding(tmp_path, speaker_label)

        return EmbeddingResponse(
            embedding=result["embedding"],
            duration_seconds=result["duration_seconds"],
            confidence=result["confidence"],
            processing_time_ms=result["processing_time_ms"],
        )

    except Exception as e:
        logger.error(f"Embedding extraction failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Embedding extraction failed: {str(e)}",
        )

    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
