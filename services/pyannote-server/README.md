# Pyannote Speaker Diarization Server

A FastAPI server that provides speaker diarization using [pyannote.audio](https://github.com/pyannote/pyannote-audio).

## Prerequisites

1. Python 3.10 or higher
2. A HuggingFace account and token
3. Accept the pyannote model license at:
   - https://huggingface.co/pyannote/speaker-diarization-3.1
   - https://huggingface.co/pyannote/segmentation-3.0

## Setup

### Local Development

1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Copy the environment file and configure:
   ```bash
   cp .env.example .env
   # Edit .env with your HuggingFace token
   ```

4. Run the server:
   ```bash
   python main.py
   ```

### Docker

1. Build the image:
   ```bash
   docker build -t pyannote-server .
   ```

2. Run the container:
   ```bash
   docker run -p 8000:8000 \
     -e PYANNOTE_HF_TOKEN=your_token_here \
     pyannote-server
   ```

## API Endpoints

### Health Check
```
GET /
GET /health
```

### Async Diarization (with callback)
```
POST /diarize
Content-Type: application/json

{
  "audio_url": "https://example.com/audio.wav",
  "callback_url": "https://your-callback-url/",
  "metadata": {
    "session_id": "abc123",
    "chunk_index": 0
  }
}
```

### Sync Diarization (returns result directly)
```
POST /diarize/sync
Content-Type: application/json

{
  "audio_url": "https://example.com/audio.wav"
}
```

### Warmup (preload model)
```
POST /warmup
```

## Response Format

```json
{
  "segments": [
    {
      "speaker": "SPEAKER_00",
      "start": 0.0,
      "end": 2.5
    },
    {
      "speaker": "SPEAKER_01",
      "start": 2.5,
      "end": 5.0
    }
  ],
  "speakers": ["SPEAKER_00", "SPEAKER_01"],
  "processing_time_ms": 1234
}
```

## Integration with SalonTalk AI

This server is designed to work with the SalonTalk AI system:

1. The mobile app uploads audio chunks to Supabase Storage
2. The `trigger-diarization` Edge Function calls this server
3. Results are sent to the `diarization-callback` Edge Function
4. The callback function saves results to the database

## GPU Support

If running on a machine with CUDA-compatible GPU, the model will automatically use it for faster processing. Make sure to install the CUDA version of PyTorch:

```bash
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu118
```

## License

This server uses pyannote.audio which has its own licensing requirements. Please ensure you comply with the [pyannote.audio license](https://github.com/pyannote/pyannote-audio/blob/main/LICENSE).
