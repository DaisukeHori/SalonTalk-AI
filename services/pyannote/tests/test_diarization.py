"""
Tests for diarization endpoints and service
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient


@pytest.fixture
def mock_pyannote_service():
    """Create a mock pyannote service."""
    service = AsyncMock()
    service.is_ready = True
    service.diarize = AsyncMock(return_value={
        "segments": [
            {"speaker": "SPEAKER_00", "start": 0.0, "end": 5.5},
            {"speaker": "SPEAKER_01", "start": 5.5, "end": 10.2},
            {"speaker": "SPEAKER_00", "start": 10.2, "end": 15.0},
        ],
        "processing_time_ms": 1234,
    })
    service.estimate_speakers = MagicMock(return_value={
        "SPEAKER_00": "stylist",
        "SPEAKER_01": "customer",
    })
    return service


class TestDiarizationService:
    """Tests for PyannoteService class."""

    def test_estimate_speakers_two_speakers(self, mock_pyannote_service):
        """Test speaker estimation with two speakers."""
        segments = [
            {"speaker": "A", "start": 0.0, "end": 10.0},  # 10 seconds
            {"speaker": "B", "start": 10.0, "end": 15.0},  # 5 seconds
        ]

        from app.services.pyannote_service import PyannoteService
        service = PyannoteService()

        result = service.estimate_speakers(segments)

        # Longer speaker should be stylist
        assert result["A"] == "stylist"
        assert result["B"] == "customer"

    def test_estimate_speakers_one_speaker(self, mock_pyannote_service):
        """Test speaker estimation with one speaker."""
        segments = [
            {"speaker": "A", "start": 0.0, "end": 10.0},
        ]

        from app.services.pyannote_service import PyannoteService
        service = PyannoteService()

        result = service.estimate_speakers(segments)

        assert result["A"] == "stylist"

    def test_estimate_speakers_empty(self, mock_pyannote_service):
        """Test speaker estimation with no segments."""
        from app.services.pyannote_service import PyannoteService
        service = PyannoteService()

        result = service.estimate_speakers([])

        assert result == {}


class TestDiarizationEndpoint:
    """Tests for diarization API endpoints."""

    @pytest.fixture
    def client(self, mock_pyannote_service):
        """Create test client with mocked service."""
        with patch("app.main.pyannote_service", mock_pyannote_service):
            from app.main import app
            return TestClient(app)

    def test_health_check(self, client):
        """Test health check endpoint."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"

    def test_diarize_missing_file(self, client):
        """Test diarization with missing file."""
        response = client.post("/api/v1/diarize")
        assert response.status_code == 422  # Validation error


class TestDiarizationWorker:
    """Tests for DiarizationWorker class."""

    @pytest.fixture
    def worker(self, mock_pyannote_service):
        """Create worker with mocked service."""
        from app.workers.diarization_worker import DiarizationWorker
        return DiarizationWorker(mock_pyannote_service, max_concurrent_jobs=1)

    @pytest.mark.asyncio
    async def test_submit_job(self, worker):
        """Test job submission."""
        job_id = await worker.submit_job(
            audio_url="https://example.com/audio.wav",
            callback_url="https://example.com/callback",
            metadata={"session_id": "test-123"},
        )

        assert job_id is not None
        job = worker.get_job_status(job_id)
        assert job is not None
        assert job.status == "pending"
        assert job.metadata["session_id"] == "test-123"

    @pytest.mark.asyncio
    async def test_worker_lifecycle(self, worker):
        """Test worker start and stop."""
        await worker.start()
        assert worker._running is True
        assert len(worker._workers) == 1

        await worker.stop()
        assert worker._running is False
        assert len(worker._workers) == 0
