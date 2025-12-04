"""
Pyannote Speaker Diarization Server

A FastAPI server that provides speaker diarization using pyannote.audio.
This server is designed to work with the SalonTalk AI system.
"""

import os
import uuid
import asyncio
import tempfile
from datetime import datetime
from typing import Optional
from pathlib import Path

import httpx
import requests
from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl

from config import get_settings, Settings

# Initialize FastAPI app
app = FastAPI(
    title="Pyannote Speaker Diarization Server",
    description="Speaker diarization service for SalonTalk AI",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global pipeline instance (lazy loaded)
_pipeline = None
_pipeline_lock = asyncio.Lock()


# ===========================================
# Models
# ===========================================


class DiarizationRequest(BaseModel):
    """Request for speaker diarization"""
    audio_url: HttpUrl
    callback_url: Optional[HttpUrl] = None
    metadata: Optional[dict] = None


class DiarizationSegment(BaseModel):
    """A segment with speaker label and timing"""
    speaker: str
    start: float  # seconds
    end: float  # seconds


class DiarizationResponse(BaseModel):
    """Response from diarization"""
    segments: list[DiarizationSegment]
    speakers: list[str]
    processing_time_ms: int


class AsyncDiarizationResponse(BaseModel):
    """Response for async diarization job"""
    job_id: str
    status: str
    message: str


class CallbackPayload(BaseModel):
    """Payload sent to callback URL"""
    job_id: str
    success: bool
    result: Optional[DiarizationResponse] = None
    error: Optional[str] = None
    metadata: Optional[dict] = None


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    model_loaded: bool
    timestamp: str


# ===========================================
# Dependencies
# ===========================================


async def verify_api_key(
    authorization: Optional[str] = Header(None),
    settings: Settings = Depends(get_settings),
):
    """Verify API key if configured"""
    if not settings.api_key:
        return True

    if not authorization:
        raise HTTPException(status_code=401, detail="API key required")

    # Support both "Bearer <key>" and just "<key>"
    key = authorization.replace("Bearer ", "").strip()
    if key != settings.api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")

    return True


async def get_pipeline(settings: Settings = Depends(get_settings)):
    """Get or initialize the diarization pipeline"""
    global _pipeline

    async with _pipeline_lock:
        if _pipeline is None:
            print("Loading pyannote pipeline...")
            from pyannote.audio import Pipeline

            _pipeline = Pipeline.from_pretrained(
                settings.diarization_model,
                use_auth_token=settings.hf_token,
            )

            # Move to GPU if available
            import torch
            if torch.cuda.is_available():
                _pipeline = _pipeline.to(torch.device("cuda"))
                print("Pipeline loaded on GPU")
            else:
                print("Pipeline loaded on CPU")

        return _pipeline


# ===========================================
# Helper Functions
# ===========================================


def download_audio(url: str, settings: Settings) -> str:
    """Download audio from URL to temporary file"""
    # Create temp directory if not exists
    temp_dir = Path(settings.temp_dir)
    temp_dir.mkdir(parents=True, exist_ok=True)

    # Generate unique filename
    filename = f"{uuid.uuid4()}.wav"
    filepath = temp_dir / filename

    # Download file
    response = requests.get(str(url), stream=True, timeout=60)
    response.raise_for_status()

    with open(filepath, "wb") as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)

    return str(filepath)


def cleanup_temp_file(filepath: str):
    """Remove temporary file"""
    try:
        if os.path.exists(filepath):
            os.remove(filepath)
    except Exception as e:
        print(f"Error cleaning up temp file: {e}")


async def run_diarization(audio_path: str, pipeline, settings: Settings) -> DiarizationResponse:
    """Run speaker diarization on audio file"""
    import time

    start_time = time.time()

    # Run pipeline
    diarization = pipeline(
        audio_path,
        min_speakers=settings.min_speakers,
        max_speakers=settings.max_speakers,
    )

    # Extract segments
    segments = []
    speakers = set()

    for turn, _, speaker in diarization.itertracks(yield_label=True):
        segments.append(DiarizationSegment(
            speaker=speaker,
            start=turn.start,
            end=turn.end,
        ))
        speakers.add(speaker)

    processing_time_ms = int((time.time() - start_time) * 1000)

    return DiarizationResponse(
        segments=segments,
        speakers=list(speakers),
        processing_time_ms=processing_time_ms,
    )


async def send_callback(
    callback_url: str,
    payload: CallbackPayload,
    settings: Settings,
):
    """Send result to callback URL"""
    async with httpx.AsyncClient() as client:
        for attempt in range(settings.max_retries):
            try:
                response = await client.post(
                    str(callback_url),
                    json=payload.model_dump(),
                    timeout=settings.callback_timeout,
                )
                if response.status_code < 400:
                    return
            except Exception as e:
                print(f"Callback attempt {attempt + 1} failed: {e}")

            if attempt < settings.max_retries - 1:
                await asyncio.sleep(2 ** attempt)  # Exponential backoff


async def process_diarization_async(
    job_id: str,
    audio_url: str,
    callback_url: Optional[str],
    metadata: Optional[dict],
    settings: Settings,
):
    """Process diarization asynchronously"""
    audio_path = None
    try:
        # Download audio
        audio_path = download_audio(audio_url, settings)

        # Get pipeline
        pipeline = await get_pipeline(settings)

        # Run diarization
        result = await run_diarization(audio_path, pipeline, settings)

        # Send callback if provided
        if callback_url:
            await send_callback(
                callback_url,
                CallbackPayload(
                    job_id=job_id,
                    success=True,
                    result=result,
                    metadata=metadata,
                ),
                settings,
            )

    except Exception as e:
        print(f"Diarization error: {e}")
        if callback_url:
            await send_callback(
                callback_url,
                CallbackPayload(
                    job_id=job_id,
                    success=False,
                    error=str(e),
                    metadata=metadata,
                ),
                settings,
            )

    finally:
        if audio_path:
            cleanup_temp_file(audio_path)


# ===========================================
# Routes
# ===========================================


@app.get("/", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        model_loaded=_pipeline is not None,
        timestamp=datetime.utcnow().isoformat(),
    )


@app.get("/health", response_model=HealthResponse)
async def health():
    """Health check endpoint (alias)"""
    return await health_check()


@app.post("/diarize", response_model=AsyncDiarizationResponse)
async def diarize_async(
    request: DiarizationRequest,
    background_tasks: BackgroundTasks,
    settings: Settings = Depends(get_settings),
    _: bool = Depends(verify_api_key),
):
    """
    Submit audio for asynchronous speaker diarization.
    Results will be sent to the callback URL when processing is complete.
    """
    job_id = str(uuid.uuid4())

    # Add background task
    background_tasks.add_task(
        process_diarization_async,
        job_id,
        str(request.audio_url),
        str(request.callback_url) if request.callback_url else None,
        request.metadata,
        settings,
    )

    return AsyncDiarizationResponse(
        job_id=job_id,
        status="processing",
        message="Diarization job submitted. Results will be sent to callback URL.",
    )


@app.post("/diarize/sync", response_model=DiarizationResponse)
async def diarize_sync(
    request: DiarizationRequest,
    settings: Settings = Depends(get_settings),
    _: bool = Depends(verify_api_key),
):
    """
    Synchronous speaker diarization.
    Waits for processing to complete and returns results directly.
    """
    audio_path = None
    try:
        # Download audio
        audio_path = download_audio(str(request.audio_url), settings)

        # Get pipeline
        pipeline = await get_pipeline(settings)

        # Run diarization
        result = await run_diarization(audio_path, pipeline, settings)

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if audio_path:
            cleanup_temp_file(audio_path)


@app.post("/warmup")
async def warmup(
    settings: Settings = Depends(get_settings),
    _: bool = Depends(verify_api_key),
):
    """
    Warm up the model by loading it into memory.
    Call this endpoint on server startup.
    """
    try:
        await get_pipeline(settings)
        return {"status": "ok", "message": "Model loaded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===========================================
# Main
# ===========================================


if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
