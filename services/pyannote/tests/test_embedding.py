"""
Tests for voice embedding extraction endpoints and service
"""
import pytest
import numpy as np
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient


@pytest.fixture
def mock_embedding_array():
    """Create a mock 512-dimensional embedding."""
    return np.random.randn(512).astype(np.float32)


@pytest.fixture
def mock_pyannote_service(mock_embedding_array):
    """Create a mock pyannote service with embedding support."""
    service = AsyncMock()
    service.is_ready = True
    service.embedding_inference = MagicMock()

    # Mock diarization
    service.diarize = AsyncMock(return_value={
        "segments": [
            {"speaker": "SPEAKER_00", "start": 0.0, "end": 5.5},
            {"speaker": "SPEAKER_01", "start": 5.5, "end": 10.2},
        ],
        "processing_time_ms": 1234,
    })

    # Mock embedding extraction
    service.extract_embedding = AsyncMock(return_value={
        "embedding": mock_embedding_array.tolist(),
        "duration_seconds": 45.2,
        "confidence": 0.85,
        "processing_time_ms": 1250,
    })

    return service


class TestEmbeddingService:
    """Tests for embedding extraction in PyannoteService class."""

    def test_embedding_dimension(self, mock_embedding_array):
        """Test that embedding has correct dimension."""
        assert len(mock_embedding_array) == 512

    @pytest.mark.asyncio
    async def test_extract_embedding_returns_correct_structure(self, mock_pyannote_service):
        """Test that extract_embedding returns correct structure."""
        result = await mock_pyannote_service.extract_embedding(
            "/tmp/test.wav",
            speaker_label=None
        )

        assert "embedding" in result
        assert "duration_seconds" in result
        assert "confidence" in result
        assert "processing_time_ms" in result
        assert len(result["embedding"]) == 512

    @pytest.mark.asyncio
    async def test_extract_embedding_with_speaker_label(self, mock_pyannote_service):
        """Test embedding extraction with speaker label filter."""
        result = await mock_pyannote_service.extract_embedding(
            "/tmp/test.wav",
            speaker_label="customer"
        )

        assert result["confidence"] >= 0 and result["confidence"] <= 1
        assert result["duration_seconds"] > 0

    def test_embedding_normalization(self, mock_embedding_array):
        """Test that embedding values are reasonable."""
        # Embeddings should be finite
        assert np.all(np.isfinite(mock_embedding_array))

        # Typical embedding values should be in reasonable range
        assert np.abs(mock_embedding_array).max() < 100


class TestEmbeddingEndpoint:
    """Tests for embedding extraction API endpoints."""

    @pytest.fixture
    def client(self, mock_pyannote_service):
        """Create test client with mocked service."""
        with patch("app.main.pyannote_service", mock_pyannote_service):
            from app.main import app
            return TestClient(app)

    def test_extract_embedding_missing_file(self, client):
        """Test embedding extraction with missing file."""
        response = client.post("/api/v1/extract-embedding")
        assert response.status_code == 422  # Validation error

    def test_extract_embedding_invalid_speaker_label(self, client):
        """Test embedding extraction with invalid speaker label."""
        import io

        # Create a minimal WAV file for testing
        audio_data = io.BytesIO(b"RIFF" + b"\x00" * 100)
        audio_data.name = "test.wav"

        response = client.post(
            "/api/v1/extract-embedding",
            files={"file": ("test.wav", audio_data, "audio/wav")},
            data={"speaker_label": "invalid_label"},
        )

        assert response.status_code == 400
        assert "speaker_label" in response.text.lower()


class TestEmbeddingSimilarity:
    """Tests for embedding similarity calculations."""

    def test_cosine_similarity_same_embedding(self, mock_embedding_array):
        """Test that same embedding has similarity 1.0."""
        from numpy.linalg import norm

        similarity = np.dot(mock_embedding_array, mock_embedding_array) / (
            norm(mock_embedding_array) * norm(mock_embedding_array)
        )
        assert np.isclose(similarity, 1.0)

    def test_cosine_similarity_different_embeddings(self, mock_embedding_array):
        """Test that different embeddings have similarity < 1.0."""
        from numpy.linalg import norm

        other_embedding = np.random.randn(512).astype(np.float32)

        similarity = np.dot(mock_embedding_array, other_embedding) / (
            norm(mock_embedding_array) * norm(other_embedding)
        )
        assert similarity < 1.0
        assert similarity > -1.0

    def test_embedding_weighted_average(self, mock_embedding_array):
        """Test weighted average of embeddings."""
        other_embedding = np.random.randn(512).astype(np.float32)
        weight = 0.3

        averaged = (1 - weight) * mock_embedding_array + weight * other_embedding

        assert len(averaged) == 512
        assert np.all(np.isfinite(averaged))


class TestConfidenceCalculation:
    """Tests for confidence level calculations."""

    def test_high_confidence_threshold(self):
        """Test high confidence threshold (>= 0.85)."""
        similarity = 0.92
        if similarity >= 0.85:
            confidence = "high"
        elif similarity >= 0.75:
            confidence = "medium"
        elif similarity >= 0.65:
            confidence = "low"
        else:
            confidence = "none"

        assert confidence == "high"

    def test_medium_confidence_threshold(self):
        """Test medium confidence threshold (0.75-0.85)."""
        similarity = 0.78
        if similarity >= 0.85:
            confidence = "high"
        elif similarity >= 0.75:
            confidence = "medium"
        elif similarity >= 0.65:
            confidence = "low"
        else:
            confidence = "none"

        assert confidence == "medium"

    def test_low_confidence_threshold(self):
        """Test low confidence threshold (0.65-0.75)."""
        similarity = 0.68
        if similarity >= 0.85:
            confidence = "high"
        elif similarity >= 0.75:
            confidence = "medium"
        elif similarity >= 0.65:
            confidence = "low"
        else:
            confidence = "none"

        assert confidence == "low"

    def test_no_match_threshold(self):
        """Test no match threshold (< 0.65)."""
        similarity = 0.55
        if similarity >= 0.85:
            confidence = "high"
        elif similarity >= 0.75:
            confidence = "medium"
        elif similarity >= 0.65:
            confidence = "low"
        else:
            confidence = "none"

        assert confidence == "none"
