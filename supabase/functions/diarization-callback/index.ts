// supabase/functions/diarization-callback/index.ts
// Receive speaker diarization results from pyannote server

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { jsonResponse, errorResponse } from "../_shared/response.ts";

const CALLBACK_SECRET = Deno.env.get("PYANNOTE_CALLBACK_SECRET");

interface DiarizationSegment {
  speaker: "SPEAKER_00" | "SPEAKER_01";
  start: number;
  end: number;
  confidence?: number;
}

interface DiarizationCallbackRequest {
  session_id: string;
  chunk_index: number;
  status: "completed" | "failed";
  segments?: DiarizationSegment[];
  error?: string;
}

Deno.serve(async (req: Request) => {
  try {
    // Verify callback secret
    const apiKey = req.headers.get("X-Callback-Secret");
    if (CALLBACK_SECRET && apiKey !== CALLBACK_SECRET) {
      return errorResponse("AUTH_001", "Unauthorized", 401);
    }

    // Use service role for database operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body: DiarizationCallbackRequest = await req.json();
    const { session_id, chunk_index, status, segments, error } = body;

    if (!session_id) {
      return errorResponse("VAL_001", "session_id is required", 400);
    }

    if (status === "failed") {
      console.error(`Diarization failed for session ${session_id}:`, error);

      // Log failure but don't update session status - diarization is per-chunk
      // and failing one chunk shouldn't fail the entire session
      return jsonResponse({
        processed: false,
        segmentCount: 0,
        analysisTriggered: false,
      });
    }

    if (!segments || segments.length === 0) {
      return jsonResponse({
        processed: false,
        segmentCount: 0,
        analysisTriggered: false,
      });
    }

    // Get existing transcripts for this chunk
    const { data: existingTranscripts } = await supabase
      .from("transcripts")
      .select("*")
      .eq("session_id", session_id)
      .eq("chunk_index", chunk_index);

    // Determine which pyannote speaker is the stylist
    // Assumption: First speaker in the session is the stylist (they greet the customer)
    const firstSpeaker = segments[0]?.speaker || "SPEAKER_00";

    // Map pyannote speakers to our speaker types
    const mapSpeaker = (pyannoteSpeaker: string): "stylist" | "customer" => {
      return pyannoteSpeaker === firstSpeaker ? "stylist" : "customer";
    };

    // Build diarization segment map for speaker assignment
    const diarizationSegments = segments.map((segment) => ({
      speaker: mapSpeaker(segment.speaker),
      start_time_ms: Math.round(segment.start * 1000),
      end_time_ms: Math.round(segment.end * 1000),
      confidence: segment.confidence || 0.9,
    }));

    let updatedCount = 0;

    // Create speaker_segments based on timing overlap with transcripts
    // Note: transcripts table uses seconds (NUMERIC), speaker_segments uses milliseconds
    if (existingTranscripts && existingTranscripts.length > 0) {
      for (const transcript of existingTranscripts) {
        // Convert transcript time from seconds to milliseconds for comparison
        const transcriptStartMs = Math.round(Number(transcript.start_time) * 1000);
        const transcriptEndMs = Math.round(Number(transcript.end_time) * 1000);

        // Find the diarization segment that overlaps most with this transcript
        let bestMatch = null;
        let maxOverlap = 0;

        for (const diarSeg of diarizationSegments) {
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
          // speaker_segments table stores speaker + text + timestamps
          await supabase
            .from("speaker_segments")
            .upsert({
              session_id,
              chunk_index,
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

    // Trigger AI analysis for this chunk
    let analysisTriggered = false;
    try {
      const analyzeResponse = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/analyze-segment`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId: session_id,
            chunkIndex: chunk_index,
          }),
        }
      );

      if (analyzeResponse.ok) {
        analysisTriggered = true;
      } else {
        console.error("Analysis trigger failed:", await analyzeResponse.text());
      }
    } catch (analyzeError) {
      console.error("Analysis trigger error:", analyzeError);
    }

    return jsonResponse({
      processed: true,
      segmentCount: updatedCount,
      analysisTriggered,
    });
  } catch (error) {
    console.error("Callback error:", error);
    return errorResponse("SYS_001", "Internal error", 500);
  }
});
