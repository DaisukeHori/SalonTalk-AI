/**
 * Pyannote.ai Cloud API Integration for Speaker Diarization
 *
 * This module provides utilities for integrating with pyannote.ai cloud API
 * for speaker diarization.
 *
 * API Documentation: https://www.pyannote.ai/
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
  callbackUrl?: string;
}

interface PyannoteJobResponse {
  jobId: string;
  status: "pending" | "processing" | "succeeded" | "failed";
  output?: {
    diarization: Array<{
      speaker: string;
      start: number;
      end: number;
    }>;
  };
  error?: string;
}

// pyannote.ai API base URL
const PYANNOTE_API_URL = "https://api.pyannote.ai/v1";

/**
 * Get pyannote API key from environment
 */
export function getPyannoteApiKey(): string {
  const apiKey = Deno.env.get("PYANNOTE_API_KEY");
  if (!apiKey) {
    throw new Error("PYANNOTE_API_KEY not configured");
  }
  return apiKey;
}

/**
 * Get pyannote server URL from environment
 * Falls back to pyannote.ai cloud API if not set
 */
export function getPyannoteServerUrl(): string {
  return Deno.env.get("PYANNOTE_SERVER_URL") || PYANNOTE_API_URL;
}

/**
 * Submit audio for speaker diarization (async with callback or polling)
 */
export async function submitDiarization(
  request: DiarizationRequest
): Promise<{ jobId: string }> {
  const apiKey = getPyannoteApiKey();
  const serverUrl = getPyannoteServerUrl();

  // Check if using pyannote.ai cloud API or self-hosted
  const isPyannoteCloud = serverUrl.includes("api.pyannote.ai");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  let requestBody: Record<string, unknown>;

  if (isPyannoteCloud) {
    // pyannote.ai cloud API format
    requestBody = {
      url: request.audioUrl,
      webhook: request.callbackUrl, // webhook callback (if supported)
    };
  } else {
    // Self-hosted server format (legacy)
    requestBody = {
      audio_url: request.audioUrl,
      callback_url: request.callbackUrl,
      metadata: {
        session_id: request.sessionId,
        chunk_index: request.chunkIndex,
      },
    };
  }

  const response = await fetch(
    isPyannoteCloud ? `${serverUrl}/diarize` : `${serverUrl}/diarize`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Pyannote API error:", error);
    throw new Error(`Pyannote API error: ${response.status} - ${error}`);
  }

  const result = await response.json();
  return { jobId: result.jobId || result.job_id };
}

/**
 * Get job status and result from pyannote.ai
 */
export async function getJobResult(
  jobId: string
): Promise<PyannoteJobResponse> {
  const apiKey = getPyannoteApiKey();
  const serverUrl = getPyannoteServerUrl();

  const response = await fetch(`${serverUrl}/jobs/${jobId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get job status: ${response.status} - ${error}`);
  }

  const result = await response.json();

  return {
    jobId: result.jobId || jobId,
    status: result.status,
    output: result.output,
    error: result.error,
  };
}

/**
 * Poll for job completion with timeout
 */
export async function pollForResult(
  jobId: string,
  timeoutMs: number = 120000, // 2 minutes default
  intervalMs: number = 3000 // 3 seconds polling interval
): Promise<DiarizationResult> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const jobResult = await getJobResult(jobId);

    if (jobResult.status === "succeeded" && jobResult.output) {
      const segments = jobResult.output.diarization || [];
      return {
        segments: segments.map((s) => ({
          speaker: s.speaker,
          start: s.start,
          end: s.end,
        })),
        speakers: [
          ...new Set(segments.map((s: { speaker: string }) => s.speaker)),
        ],
        processingTimeMs: Date.now() - startTime,
      };
    }

    if (jobResult.status === "failed") {
      throw new Error(
        `Diarization failed: ${jobResult.error || "Unknown error"}`
      );
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Diarization timeout after ${timeoutMs}ms`);
}

/**
 * Submit audio for speaker diarization (sync - wait for result via polling)
 */
export async function diarizeSynchronous(
  audioUrl: string
): Promise<DiarizationResult> {
  // Submit job
  const { jobId } = await submitDiarization({
    sessionId: "",
    chunkIndex: 0,
    audioUrl,
  });

  // Poll for result
  return await pollForResult(jobId);
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
): Record<string, "stylist" | "customer"> {
  // Sort segments by start time to find who spoke first
  const sortedSegments = [...segments].sort((a, b) => a.start - b.start);

  // First speaker is assumed to be the stylist
  const firstSpeaker = sortedSegments[0]?.speaker || speakers[0];

  const mapping: Record<string, "stylist" | "customer"> = {};
  for (const speaker of speakers) {
    mapping[speaker] = speaker === firstSpeaker ? "stylist" : "customer";
  }

  return mapping;
}

/**
 * Merge diarization segments with transcription
 */
export function mergeWithTranscription(
  diarization: Array<{ speaker: string; startTimeMs: number; endTimeMs: number }>,
  transcription: Array<{ text: string; startTimeMs: number; endTimeMs: number }>,
  speakerMapping: Record<string, "stylist" | "customer">
): Array<{
  speaker: "stylist" | "customer" | "unknown";
  speakerLabel: string;
  text: string;
  startTimeMs: number;
  endTimeMs: number;
}> {
  const merged: Array<{
    speaker: "stylist" | "customer" | "unknown";
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
        speaker: speakerMapping[overlapSegment.speaker] || "unknown",
        speakerLabel: overlapSegment.speaker,
        text: trans.text,
        startTimeMs: trans.startTimeMs,
        endTimeMs: trans.endTimeMs,
      });
    } else {
      merged.push({
        speaker: "unknown",
        speakerLabel: "",
        text: trans.text,
        startTimeMs: trans.startTimeMs,
        endTimeMs: trans.endTimeMs,
      });
    }
  }

  return merged.sort((a, b) => a.startTimeMs - b.startTimeMs);
}

/**
 * Process diarization result and save to database
 * This is used when webhook callback is received or after polling
 */
export function processDiarizationResult(
  segments: DiarizationSegment[]
): Array<{
  speaker: "stylist" | "customer";
  start_time_ms: number;
  end_time_ms: number;
  confidence: number;
}> {
  if (segments.length === 0) {
    return [];
  }

  // Determine which pyannote speaker is the stylist
  // Assumption: First speaker in the session is the stylist (they greet the customer)
  const sortedSegments = [...segments].sort((a, b) => a.start - b.start);
  const firstSpeaker = sortedSegments[0]?.speaker || "SPEAKER_00";

  // Map pyannote speakers to our speaker types
  const mapSpeaker = (pyannoteSpeaker: string): "stylist" | "customer" => {
    return pyannoteSpeaker === firstSpeaker ? "stylist" : "customer";
  };

  return segments.map((segment) => ({
    speaker: mapSpeaker(segment.speaker),
    start_time_ms: Math.round(segment.start * 1000),
    end_time_ms: Math.round(segment.end * 1000),
    confidence: 0.9, // pyannote.ai doesn't return confidence, default to 0.9
  }));
}
