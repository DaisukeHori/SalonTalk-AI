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
from app.models.diarization import DiarizationRequest, DiarizationResponse, DiarizationSegment

logger = structlog.get_logger()
router = APIRouter()


@router.post("/diarize", response_model=DiarizationResponse)
async def diarize_audio(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    session_id: str = Form(...),
    chunk_index: int = Form(...),
    callback_url: Optional[str] = Form(None),
):
    """
    Process audio file for speaker diarization.

    - **file**: Audio file (WAV, MP3, M4A)
    - **session_id**: Session identifier
    - **chunk_index**: Chunk index within the session
    - **callback_url**: Optional webhook URL for async processing
    """
    logger.info(
        "Received diarization request",
        session_id=session_id,
        chunk_index=chunk_index,
        filename=file.filename,
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
            )
            return DiarizationResponse(
                session_id=session_id,
                chunk_index=chunk_index,
                segments=[],
                processing_time_ms=0,
                status="processing",
            )

        # Synchronous processing
        result = await service.diarize(tmp_path)

        segments = [
            DiarizationSegment(
                speaker=seg["speaker"],
                start_time_ms=int(seg["start"] * 1000),
                end_time_ms=int(seg["end"] * 1000),
            )
            for seg in result["segments"]
        ]

        return DiarizationResponse(
            session_id=session_id,
            chunk_index=chunk_index,
            segments=segments,
            processing_time_ms=result["processing_time_ms"],
            status="completed",
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
):
    """Process audio and send result to callback URL."""
    try:
        service = get_pyannote_service()
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
