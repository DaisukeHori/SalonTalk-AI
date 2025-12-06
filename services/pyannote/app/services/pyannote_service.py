"""
Pyannote speaker diarization service
"""

import os
import time
from typing import Any, Dict, List, Optional, Tuple

import structlog
import torch
import numpy as np

logger = structlog.get_logger()


class PyannoteService:
    """Service for speaker diarization using pyannote.audio."""

    def __init__(self):
        self.pipeline = None
        self.embedding_model = None
        self.is_ready = False
        self.device = "cuda" if torch.cuda.is_available() else "cpu"

    async def initialize(self):
        """Initialize the pyannote pipeline and embedding model."""
        try:
            from pyannote.audio import Pipeline, Model, Inference

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

            # Load the speaker embedding model
            logger.info("Loading speaker embedding model...")
            embedding_model = Model.from_pretrained(
                "pyannote/embedding",
                use_auth_token=hf_token,
            )
            self.embedding_inference = Inference(
                embedding_model,
                window="whole",
            )

            # Move to GPU if available
            if self.device == "cuda":
                self.pipeline.to(torch.device("cuda"))
                self.embedding_inference.model.to(torch.device("cuda"))

            self.is_ready = True
            logger.info("Pyannote pipeline and embedding model loaded successfully")

        except Exception as e:
            logger.error(f"Failed to initialize pyannote: {e}")
            raise

    async def cleanup(self):
        """Cleanup resources."""
        self.pipeline = None
        self.embedding_inference = None
        self.is_ready = False
        if self.device == "cuda":
            torch.cuda.empty_cache()

    async def extract_embedding(
        self,
        audio_path: str,
        speaker_label: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Extract speaker embedding from an audio file.

        Args:
            audio_path: Path to the audio file
            speaker_label: Optional speaker label to extract embedding for
                           If provided, will first diarize and extract only that speaker's audio

        Returns:
            Dict containing embedding, duration, confidence, and processing time
        """
        if not self.is_ready or self.embedding_inference is None:
            raise RuntimeError("Pyannote embedding model not initialized")

        start_time = time.time()

        try:
            from pyannote.audio import Audio
            from pyannote.core import Segment

            audio = Audio()

            # Get audio duration
            waveform, sample_rate = audio(audio_path)
            duration_seconds = waveform.shape[1] / sample_rate

            # If speaker_label is specified, we need to diarize first and extract that speaker
            if speaker_label and self.pipeline is not None:
                diarization = self.pipeline(audio_path)

                # Find segments for the specified speaker or estimate which is customer
                speaker_segments = []
                speaker_durations: Dict[str, float] = {}

                for turn, _, speaker in diarization.itertracks(yield_label=True):
                    speaker_durations[speaker] = (
                        speaker_durations.get(speaker, 0) + (turn.end - turn.start)
                    )
                    speaker_segments.append({
                        "speaker": speaker,
                        "start": turn.start,
                        "end": turn.end,
                    })

                # Identify which speaker is the customer (less talking time)
                if speaker_label == "customer" and len(speaker_durations) >= 2:
                    sorted_speakers = sorted(
                        speaker_durations.items(), key=lambda x: x[1]
                    )
                    target_speaker = sorted_speakers[0][0]  # Less talking = customer
                elif speaker_label == "stylist" and len(speaker_durations) >= 2:
                    sorted_speakers = sorted(
                        speaker_durations.items(), key=lambda x: x[1], reverse=True
                    )
                    target_speaker = sorted_speakers[0][0]  # More talking = stylist
                else:
                    # Use first speaker or the specified label directly
                    target_speaker = list(speaker_durations.keys())[0] if speaker_durations else None

                if target_speaker:
                    # Extract embeddings for each segment and average them
                    embeddings = []
                    for seg in speaker_segments:
                        if seg["speaker"] == target_speaker:
                            segment = Segment(seg["start"], seg["end"])
                            if seg["end"] - seg["start"] >= 0.5:  # Minimum 0.5s segment
                                try:
                                    emb = self.embedding_inference.crop(
                                        audio_path, segment
                                    )
                                    embeddings.append(emb)
                                except Exception:
                                    continue

                    if embeddings:
                        # Average all embeddings
                        embedding_array = np.mean(
                            np.stack(embeddings), axis=0
                        )
                        # Calculate confidence based on number of segments
                        confidence = min(len(embeddings) / 5.0, 1.0)
                    else:
                        # Fall back to whole audio
                        embedding_array = self.embedding_inference(audio_path)
                        confidence = 0.5
                else:
                    # Fall back to whole audio
                    embedding_array = self.embedding_inference(audio_path)
                    confidence = 0.5
            else:
                # Extract embedding from whole audio
                embedding_array = self.embedding_inference(audio_path)
                confidence = 0.8 if duration_seconds >= 5 else 0.5

            # Convert to list
            embedding = embedding_array.flatten().tolist()

            processing_time_ms = int((time.time() - start_time) * 1000)

            logger.info(
                "Embedding extracted",
                embedding_dim=len(embedding),
                duration_seconds=duration_seconds,
                confidence=confidence,
                processing_time_ms=processing_time_ms,
            )

            return {
                "embedding": embedding,
                "duration_seconds": duration_seconds,
                "confidence": confidence,
                "processing_time_ms": processing_time_ms,
            }

        except Exception as e:
            logger.error(f"Embedding extraction failed: {e}")
            raise

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
