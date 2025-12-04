"""
Diarization Worker
Background task worker for processing diarization jobs
"""
import asyncio
import os
import tempfile
from typing import Any, Callable, Dict, Optional
from dataclasses import dataclass
from datetime import datetime
import uuid

import structlog
import httpx

logger = structlog.get_logger()


@dataclass
class DiarizationJob:
    """Represents a diarization job."""
    id: str
    audio_url: str
    callback_url: str
    metadata: Dict[str, Any]
    status: str  # pending, processing, completed, failed
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class DiarizationWorker:
    """
    Background worker for processing diarization jobs.
    Handles downloading audio, running diarization, and sending callbacks.
    """

    def __init__(
        self,
        diarization_service: Any,
        max_concurrent_jobs: int = 2,
    ):
        self.diarization_service = diarization_service
        self.max_concurrent_jobs = max_concurrent_jobs
        self.jobs: Dict[str, DiarizationJob] = {}
        self.job_queue: asyncio.Queue[str] = asyncio.Queue()
        self._workers: list[asyncio.Task[None]] = []
        self._running = False
        self._http_client: Optional[httpx.AsyncClient] = None

    async def start(self):
        """Start the worker pool."""
        if self._running:
            return

        self._running = True
        self._http_client = httpx.AsyncClient(timeout=60.0)

        # Start worker tasks
        for i in range(self.max_concurrent_jobs):
            task = asyncio.create_task(self._worker_loop(i))
            self._workers.append(task)

        logger.info(f"Started {self.max_concurrent_jobs} diarization workers")

    async def stop(self):
        """Stop the worker pool."""
        self._running = False

        # Cancel all workers
        for task in self._workers:
            task.cancel()

        # Wait for workers to finish
        await asyncio.gather(*self._workers, return_exceptions=True)
        self._workers.clear()

        if self._http_client:
            await self._http_client.aclose()
            self._http_client = None

        logger.info("Diarization workers stopped")

    async def submit_job(
        self,
        audio_url: str,
        callback_url: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Submit a new diarization job.

        Returns:
            Job ID
        """
        job_id = str(uuid.uuid4())
        job = DiarizationJob(
            id=job_id,
            audio_url=audio_url,
            callback_url=callback_url,
            metadata=metadata or {},
            status="pending",
            created_at=datetime.utcnow(),
        )

        self.jobs[job_id] = job
        await self.job_queue.put(job_id)

        logger.info(f"Submitted diarization job", job_id=job_id)
        return job_id

    def get_job_status(self, job_id: str) -> Optional[DiarizationJob]:
        """Get the status of a job."""
        return self.jobs.get(job_id)

    async def _worker_loop(self, worker_id: int):
        """Main worker loop."""
        logger.info(f"Worker {worker_id} started")

        while self._running:
            try:
                # Get next job from queue (with timeout to allow shutdown)
                try:
                    job_id = await asyncio.wait_for(
                        self.job_queue.get(), timeout=1.0
                    )
                except asyncio.TimeoutError:
                    continue

                job = self.jobs.get(job_id)
                if not job:
                    continue

                await self._process_job(job, worker_id)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Worker {worker_id} error: {e}")

        logger.info(f"Worker {worker_id} stopped")

    async def _process_job(self, job: DiarizationJob, worker_id: int):
        """Process a single diarization job."""
        logger.info(f"Worker {worker_id} processing job", job_id=job.id)

        job.status = "processing"
        job.started_at = datetime.utcnow()

        try:
            # Download audio file
            audio_path = await self._download_audio(job.audio_url)

            try:
                # Run diarization
                result = await self.diarization_service.diarize(audio_path)

                # Estimate speaker roles
                role_mapping = self.diarization_service.estimate_speakers(
                    result["segments"]
                )

                # Map speaker IDs to roles
                for segment in result["segments"]:
                    speaker_id = segment["speaker"]
                    segment["role"] = role_mapping.get(speaker_id, "unknown")

                job.result = result
                job.status = "completed"
                job.completed_at = datetime.utcnow()

                logger.info(
                    f"Job completed",
                    job_id=job.id,
                    num_segments=len(result["segments"]),
                )

            finally:
                # Clean up downloaded file
                if os.path.exists(audio_path):
                    os.remove(audio_path)

        except Exception as e:
            job.status = "failed"
            job.error = str(e)
            job.completed_at = datetime.utcnow()
            logger.error(f"Job failed", job_id=job.id, error=str(e))

        # Send callback
        await self._send_callback(job)

    async def _download_audio(self, audio_url: str) -> str:
        """Download audio file to temporary location."""
        if not self._http_client:
            raise RuntimeError("HTTP client not initialized")

        response = await self._http_client.get(audio_url)
        response.raise_for_status()

        # Create temp file
        suffix = ".wav" if ".wav" in audio_url.lower() else ".m4a"
        fd, path = tempfile.mkstemp(suffix=suffix)

        try:
            with os.fdopen(fd, "wb") as f:
                f.write(response.content)
        except Exception:
            os.close(fd)
            raise

        return path

    async def _send_callback(self, job: DiarizationJob):
        """Send callback with job result."""
        if not self._http_client:
            return

        try:
            payload = {
                "job_id": job.id,
                "status": job.status,
                "metadata": job.metadata,
                "started_at": job.started_at.isoformat() if job.started_at else None,
                "completed_at": job.completed_at.isoformat() if job.completed_at else None,
            }

            if job.status == "completed" and job.result:
                payload["result"] = job.result
            elif job.status == "failed" and job.error:
                payload["error"] = job.error

            response = await self._http_client.post(
                job.callback_url,
                json=payload,
                headers={"Content-Type": "application/json"},
            )
            response.raise_for_status()

            logger.info(f"Callback sent", job_id=job.id, status=job.status)

        except Exception as e:
            logger.error(f"Failed to send callback", job_id=job.id, error=str(e))
