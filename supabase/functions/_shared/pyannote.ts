/**
 * Pyannote Server Integration for Speaker Diarization
 *
 * This module provides utilities for integrating with a self-hosted
 * pyannote.audio server for speaker diarization.
 */

interface DiarizationSegment {
  speaker: string; // 'SPEAKER_00', 'SPEAKER_01', etc.
  start: number; // Start time in seconds
  end: number; // End time in seconds
}

interface DiarizationResult {
  segments: DiarizationSegment[];
  speakers: string[];
  processingTimeMs: number;
}

interface DiarizationRequest {
  sessionId: string;
  chunkIndex: number;
  audioUrl: string;
  callbackUrl: string;
}

/**
 * Get pyannote server URL from environment
 */
export function getPyannoteServerUrl(): string {
  const url = Deno.env.get('PYANNOTE_SERVER_URL');
  if (!url) {
    throw new Error('PYANNOTE_SERVER_URL not configured');
  }
  return url;
}

/**
 * Get pyannote API key from environment (if required)
 */
export function getPyannoteApiKey(): string | undefined {
  return Deno.env.get('PYANNOTE_API_KEY');
}

/**
 * Submit audio for speaker diarization (async with callback)
 */
export async function submitDiarization(request: DiarizationRequest): Promise<{ jobId: string }> {
  const serverUrl = getPyannoteServerUrl();
  const apiKey = getPyannoteApiKey();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const response = await fetch(`${serverUrl}/diarize`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      audio_url: request.audioUrl,
      callback_url: request.callbackUrl,
      metadata: {
        session_id: request.sessionId,
        chunk_index: request.chunkIndex,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Pyannote server error:', error);
    throw new Error(`Pyannote server error: ${response.status}`);
  }

  const result = await response.json();
  return { jobId: result.job_id };
}

/**
 * Submit audio for speaker diarization (sync - wait for result)
 */
export async function diarizeSynchronous(audioUrl: string): Promise<DiarizationResult> {
  const serverUrl = getPyannoteServerUrl();
  const apiKey = getPyannoteApiKey();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const startTime = Date.now();

  const response = await fetch(`${serverUrl}/diarize/sync`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      audio_url: audioUrl,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Pyannote server error:', error);
    throw new Error(`Pyannote server error: ${response.status}`);
  }

  const result = await response.json();
  const processingTimeMs = Date.now() - startTime;

  return {
    segments: result.segments.map((s: { speaker: string; start: number; end: number }) => ({
      speaker: s.speaker,
      start: s.start,
      end: s.end,
    })),
    speakers: result.speakers || [...new Set(result.segments.map((s: { speaker: string }) => s.speaker))],
    processingTimeMs,
  };
}

/**
 * Convert diarization result to milliseconds
 */
export function convertToMilliseconds(
  result: DiarizationResult
): Array<{ speaker: string; startTimeMs: number; endTimeMs: number }> {
  return result.segments.map((segment) => ({
    speaker: segment.speaker,
    startTimeMs: Math.round(segment.start * 1000),
    endTimeMs: Math.round(segment.end * 1000),
  }));
}

/**
 * Map speaker labels to roles
 * By default, assumes first speaker (usually SPEAKER_00) is the stylist
 */
export function mapSpeakersToRoles(
  speakers: string[],
  segments: DiarizationSegment[]
): Record<string, 'stylist' | 'customer'> {
  // Sort segments by start time to find who spoke first
  const sortedSegments = [...segments].sort((a, b) => a.start - b.start);

  // First speaker is assumed to be the stylist
  const firstSpeaker = sortedSegments[0]?.speaker || speakers[0];

  const mapping: Record<string, 'stylist' | 'customer'> = {};
  for (const speaker of speakers) {
    mapping[speaker] = speaker === firstSpeaker ? 'stylist' : 'customer';
  }

  return mapping;
}

/**
 * Merge diarization segments with transcription
 */
export function mergeWithTranscription(
  diarization: Array<{ speaker: string; startTimeMs: number; endTimeMs: number }>,
  transcription: Array<{ text: string; startTimeMs: number; endTimeMs: number }>,
  speakerMapping: Record<string, 'stylist' | 'customer'>
): Array<{
  speaker: 'stylist' | 'customer' | 'unknown';
  speakerLabel: string;
  text: string;
  startTimeMs: number;
  endTimeMs: number;
}> {
  const merged: Array<{
    speaker: 'stylist' | 'customer' | 'unknown';
    speakerLabel: string;
    text: string;
    startTimeMs: number;
    endTimeMs: number;
  }> = [];

  for (const trans of transcription) {
    // Find overlapping diarization segment
    const overlapSegment = diarization.find((d) => {
      const overlapStart = Math.max(d.startTimeMs, trans.startTimeMs);
      const overlapEnd = Math.min(d.endTimeMs, trans.endTimeMs);
      return overlapEnd > overlapStart;
    });

    if (overlapSegment) {
      merged.push({
        speaker: speakerMapping[overlapSegment.speaker] || 'unknown',
        speakerLabel: overlapSegment.speaker,
        text: trans.text,
        startTimeMs: trans.startTimeMs,
        endTimeMs: trans.endTimeMs,
      });
    } else {
      merged.push({
        speaker: 'unknown',
        speakerLabel: '',
        text: trans.text,
        startTimeMs: trans.startTimeMs,
        endTimeMs: trans.endTimeMs,
      });
    }
  }

  return merged.sort((a, b) => a.startTimeMs - b.startTimeMs);
}
