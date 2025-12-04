"""
Configuration for Pyannote Server
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Server settings
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False

    # Pyannote settings
    # You need to accept the model license and get HuggingFace token
    # https://huggingface.co/pyannote/speaker-diarization-3.1
    hf_token: str = ""

    # Model settings
    # Use "pyannote/speaker-diarization-3.1" for the latest model
    diarization_model: str = "pyannote/speaker-diarization-3.1"

    # Number of speakers (if known in advance, otherwise None for auto-detection)
    min_speakers: int = 2
    max_speakers: int = 2  # In salon context, usually 2 (stylist + customer)

    # Audio processing settings
    sample_rate: int = 16000
    temp_dir: str = "/tmp/pyannote"

    # API settings
    api_key: str = ""  # Optional API key for authentication

    # Callback settings
    callback_timeout: int = 30  # seconds
    max_retries: int = 3

    class Config:
        env_file = ".env"
        env_prefix = "PYANNOTE_"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
