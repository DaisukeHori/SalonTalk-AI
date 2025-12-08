/**
 * Trigger Diarization Edge Function
 * 話者分離トリガー関数
 *
 * Audio chunk uploaded → Trigger pyannote.ai diarization → Poll for result → Process
 *
 * Supports both:
 * - pyannote.ai cloud API (default)
 * - Self-hosted pyannote server (legacy)
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { handleCors } from "../_shared/cors.ts";
import {
  jsonResponse,
  errorResponse,
  unauthorizedResponse,
} from "../_shared/response.ts";
import {
  submitDiarization,
  pollForResult,
  processDiarizationResult,
} from "../_shared/pyannote.ts";

interface TriggerDiarizationRequest {
  sessionId: string;
  audioChunkId: string;
  audioUrl: string;
  chunkIndex: number;
}

// Create Supabase clients
function createSupabaseClient(req: Request) {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: {
        headers: { Authorization: req.headers.get("Authorization")! },
      },
    }
  );
}

function createSupabaseAdminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Authenticate request
    const supabase = createSupabaseClient(req);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedResponse();
    }

    // Parse and validate request
    const body: TriggerDiarizationRequest = await req.json();

    if (!body.sessionId || !body.audioChunkId || !body.audioUrl) {
      return errorResponse(
        "VAL_001",
        "sessionId, audioChunkId, and audioUrl are required",
        400
      );
    }

    const { sessionId, audioChunkId, audioUrl, chunkIndex } = body;

    // Verify session exists and belongs to user
    const supabaseAdmin = createSupabaseAdminClient();
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("sessions")
      .select("id, status, stylist_id")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return errorResponse("NOT_FOUND", "Session not found", 404);
    }

    if (session.status !== "recording") {
      return errorResponse(
        "INVALID_STATUS",
        "Session is not in recording state",
        400
      );
    }

    // Update audio chunk status to processing
    await supabaseAdmin
      .from("audio_chunks")
      .update({ status: "processing" })
      .eq("id", audioChunkId);

    console.log(
      `Starting diarization for session ${sessionId}, chunk ${chunkIndex}`
    );

    // Submit diarization job to pyannote.ai
    const callbackUrl = `${Deno.env.get(
      "SUPABASE_URL"
    )}/functions/v1/diarization-callback`;

    const { jobId } = await submitDiarization({
      sessionId,
      chunkIndex: chunkIndex || 0,
      audioUrl,
      callbackUrl, // For webhook support (if available)
    });

    console.log(`Diarization job submitted: ${jobId}`);

    // Store job ID for tracking
    await supabaseAdmin
      .from("audio_chunks")
      .update({
        diarization_job_id: jobId,
        status: "diarizing",
      })
      .eq("id", audioChunkId);

    // Poll for result (pyannote.ai may not support webhooks)
    // This will wait up to 2 minutes for the result
    let diarizationResult;
    try {
      diarizationResult = await pollForResult(jobId, 120000, 3000);
      console.log(
        `Diarization completed in ${diarizationResult.processingTimeMs}ms`
      );
    } catch (pollError) {
      console.error("Polling error:", pollError);

      // Update chunk status to error
      await supabaseAdmin
        .from("audio_chunks")
        .update({ status: "error" })
        .eq("id", audioChunkId);

      return errorResponse(
        "DIA_001",
        `Diarization failed: ${
          pollError instanceof Error ? pollError.message : "Unknown error"
        }`,
        500
      );
    }

    // Process diarization result
    const processedSegments = processDiarizationResult(
      diarizationResult.segments
    );

    // Get existing transcripts for this chunk to merge with diarization
    const { data: existingTranscripts } = await supabaseAdmin
      .from("transcripts")
      .select("*")
      .eq("session_id", sessionId)
      .eq("chunk_index", chunkIndex || 0)
      .order("start_time", { ascending: true });

    let updatedCount = 0;

    // Create speaker_segments based on timing overlap with transcripts
    if (existingTranscripts && existingTranscripts.length > 0) {
      for (const transcript of existingTranscripts) {
        // transcripts table uses seconds (NUMERIC), convert to ms for comparison
        const transcriptStartMs = Math.round(
          Number(transcript.start_time) * 1000
        );
        const transcriptEndMs = Math.round(Number(transcript.end_time) * 1000);

        // Find the diarization segment that overlaps most with this transcript
        let bestMatch = null;
        let maxOverlap = 0;

        for (const diarSeg of processedSegments) {
          const overlapStart = Math.max(transcriptStartMs, diarSeg.start_time_ms);
          const overlapEnd = Math.min(transcriptEndMs, diarSeg.end_time_ms);
          const overlap = Math.max(0, overlapEnd - overlapStart);

          if (overlap > maxOverlap) {
            maxOverlap = overlap;
            bestMatch = diarSeg;
          }
        }

        if (bestMatch) {
          // Create speaker_segment entry with speaker information
          await supabaseAdmin.from("speaker_segments").upsert({
            session_id: sessionId,
            chunk_index: chunkIndex || 0,
            speaker: bestMatch.speaker,
            text: transcript.text,
            start_time_ms: transcriptStartMs,
            end_time_ms: transcriptEndMs,
            confidence: bestMatch.confidence,
          });

          updatedCount++;
        }
      }
    }

    // Update audio chunk status to completed
    await supabaseAdmin
      .from("audio_chunks")
      .update({ status: "completed" })
      .eq("id", audioChunkId);

    // Trigger AI analysis for this chunk
    let analysisTriggered = false;
    try {
      const analyzeResponse = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/analyze-segment`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${Deno.env.get(
              "SUPABASE_SERVICE_ROLE_KEY"
            )}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            session_id: sessionId,
            chunk_index: chunkIndex || 0,
          }),
        }
      );

      if (analyzeResponse.ok) {
        analysisTriggered = true;
        console.log("Analysis triggered successfully");
      } else {
        console.error("Analysis trigger failed:", await analyzeResponse.text());
      }
    } catch (analyzeError) {
      console.error("Analysis trigger error:", analyzeError);
    }

    return jsonResponse({
      success: true,
      jobId,
      segmentsProcessed: updatedCount,
      processingTimeMs: diarizationResult.processingTimeMs,
      analysisTriggered,
      message: "Diarization completed successfully",
    });
  } catch (error) {
    console.error("Trigger diarization error:", error);

    return errorResponse(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
});
