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

      // Don't update session status on failure - let it continue without diarization
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

    // Get existing speaker segments for this chunk
    const { data: existingSegments } = await supabase
      .from("speaker_segments")
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

    // Update existing segments with speaker information
    // Or insert new segments if diarization provides more detail
    const speakerSegments = segments.map((segment) => ({
      session_id,
      chunk_index,
      speaker: mapSpeaker(segment.speaker),
      text: null, // Text will be from the original segment
      start_time_ms: Math.round(segment.start * 1000),
      end_time_ms: Math.round(segment.end * 1000),
      confidence: segment.confidence || 0.9,
    }));

    // If we have existing segments with text, try to match them with diarization
    if (existingSegments && existingSegments.length > 0) {
      // Update the existing segment's speaker based on timing overlap
      for (const existing of existingSegments) {
        // Find the diarization segment that overlaps most with this text segment
        let bestMatch = null;
        let maxOverlap = 0;

        for (const diarSeg of speakerSegments) {
          const overlapStart = Math.max(existing.start_time_ms, diarSeg.start_time_ms);
          const overlapEnd = Math.min(existing.end_time_ms, diarSeg.end_time_ms);
          const overlap = Math.max(0, overlapEnd - overlapStart);

          if (overlap > maxOverlap) {
            maxOverlap = overlap;
            bestMatch = diarSeg;
          }
        }

        if (bestMatch) {
          await supabase
            .from("speaker_segments")
            .update({
              speaker: bestMatch.speaker,
              confidence: bestMatch.confidence,
            })
            .eq("id", existing.id);
        }
      }
    } else {
      // Insert new segments
      const { error: insertError } = await supabase
        .from("speaker_segments")
        .insert(speakerSegments);

      if (insertError) {
        console.error("Insert error:", insertError);
        throw insertError;
      }
    }

    // Trigger AI analysis for this chunk
    let analysisTriggered = false;
    try {
      const analyzeResponse = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/analyze-conversation`,
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
      segmentCount: speakerSegments.length,
      analysisTriggered,
    });
  } catch (error) {
    console.error("Callback error:", error);
    return errorResponse("SYS_001", "Internal error", 500);
  }
});
