"""
Pyannote speaker diarization service
"""

import os
import time
from typing import Any, Dict, List

import structlog
import torch

logger = structlog.get_logger()


class PyannoteService:
    """Service for speaker diarization using pyannote.audio."""

    def __init__(self):
        self.pipeline = None
        self.is_ready = False
        self.device = "cuda" if torch.cuda.is_available() else "cpu"

    async def initialize(self):
        """Initialize the pyannote pipeline."""
        try:
            from pyannote.audio import Pipeline

            # Get HuggingFace token from environment
            hf_token = os.getenv("HUGGINGFACE_TOKEN")
            if not hf_token:
                raise ValueError("HUGGINGFACE_TOKEN environment variable not set")

            logger.info(f"Loading pyannote pipeline on {self.device}...")

            # Load the speaker diarization pipeline
            self.pipeline = Pipeline.from_pretrained(
                "pyannote/speaker-diarization-3.1",
                use_auth_token=hf_token,
            )

            # Move to GPU if available
            if self.device == "cuda":
                self.pipeline.to(torch.device("cuda"))

            self.is_ready = True
            logger.info("Pyannote pipeline loaded successfully")

        except Exception as e:
            logger.error(f"Failed to initialize pyannote pipeline: {e}")
            raise

    async def cleanup(self):
        """Cleanup resources."""
        self.pipeline = None
        self.is_ready = False
        if self.device == "cuda":
            torch.cuda.empty_cache()

    async def diarize(self, audio_path: str) -> Dict[str, Any]:
        """
        Perform speaker diarization on an audio file.

        Args:
            audio_path: Path to the audio file

        Returns:
            Dict containing segments and processing time
        """
        if not self.is_ready or self.pipeline is None:
            raise RuntimeError("Pyannote pipeline not initialized")

        start_time = time.time()

        try:
            # Run diarization
            diarization = self.pipeline(audio_path)

            # Convert to segments
            segments: List[Dict[str, Any]] = []
            for turn, _, speaker in diarization.itertracks(yield_label=True):
                segments.append({
                    "speaker": speaker,
                    "start": turn.start,
                    "end": turn.end,
                })

            processing_time_ms = int((time.time() - start_time) * 1000)

            logger.info(
                "Diarization completed",
                num_segments=len(segments),
                processing_time_ms=processing_time_ms,
            )

            return {
                "segments": segments,
                "processing_time_ms": processing_time_ms,
            }

        except Exception as e:
            logger.error(f"Diarization failed: {e}")
            raise

    def estimate_speakers(self, segments: List[Dict[str, Any]]) -> Dict[str, str]:
        """
        Estimate which speaker is the stylist vs customer.
        Heuristic: The speaker with more total speaking time is likely the stylist.

        Returns:
            Dict mapping speaker IDs to roles ('stylist' or 'customer')
        """
        speaker_durations: Dict[str, float] = {}

        for seg in segments:
            speaker = seg["speaker"]
            duration = seg["end"] - seg["start"]
            speaker_durations[speaker] = speaker_durations.get(speaker, 0) + duration

        if len(speaker_durations) < 2:
            # Only one speaker detected
            return {list(speaker_durations.keys())[0]: "stylist"} if speaker_durations else {}

        # Sort by duration (descending)
        sorted_speakers = sorted(speaker_durations.items(), key=lambda x: x[1], reverse=True)

        return {
            sorted_speakers[0][0]: "stylist",
            sorted_speakers[1][0]: "customer",
        }
