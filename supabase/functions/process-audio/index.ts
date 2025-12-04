// supabase/functions/process-audio/index.ts
// Process audio chunks, save to storage, and trigger diarization

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createSupabaseClient, getUser, getStaff } from "../_shared/supabase.ts";
import { jsonResponse, errorResponse, unauthorizedResponse } from "../_shared/response.ts";
import { corsHeaders } from "../_shared/cors.ts";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const PYANNOTE_SERVER = Deno.env.get("PYANNOTE_SERVER_URL");
const PYANNOTE_API_KEY = Deno.env.get("PYANNOTE_API_KEY");

interface TranscriptData {
  text: string;
  startTime: number;
  endTime: number;
  segments?: Array<{
    text: string;
    startTime: number;
    endTime: number;
    confidence: number;
  }>;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return unauthorizedResponse("認証が必要です");
    }

    const supabase = createSupabaseClient(authHeader);
    const user = await getUser(supabase);
    if (!user) {
      return unauthorizedResponse("認証に失敗しました");
    }

    // Parse multipart form data
    const formData = await req.formData();
    const sessionId = formData.get("sessionId") as string;
    const chunkIndexStr = formData.get("chunkIndex") as string;
    const audioFile = formData.get("audio") as File;
    const transcriptsJson = formData.get("transcripts") as string;

    // Validation
    if (!sessionId) {
      return errorResponse("VAL_001", "sessionIdが必要です", 400);
    }
    if (!chunkIndexStr || isNaN(parseInt(chunkIndexStr, 10))) {
      return errorResponse("VAL_001", "chunkIndexが必要です", 400);
    }
    if (!audioFile) {
      return errorResponse("VAL_001", "音声ファイルが必要です", 400);
    }
    if (!transcriptsJson) {
      return errorResponse("VAL_001", "文字起こしデータが必要です", 400);
    }

    const chunkIndex = parseInt(chunkIndexStr, 10);

    if (audioFile.size > MAX_FILE_SIZE) {
      return errorResponse("VAL_002", "ファイルサイズが上限（10MB）を超えています", 400);
    }

    // Verify session exists and is recording
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("id, salon_id, stylist_id, status")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return errorResponse("SES_001", "セッションが見つかりません", 404);
    }

    if (session.status !== "recording") {
      return errorResponse("SES_002", "セッションは録音中ではありません", 400);
    }

    // Upload audio file to storage
    const date = new Date().toISOString().split("T")[0];
    const audioPath = `${session.salon_id}/${date}/${sessionId}/chunk_${chunkIndex.toString().padStart(4, "0")}.wav`;

    const audioBuffer = await audioFile.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("audio-chunks")
      .upload(audioPath, audioBuffer, {
        contentType: "audio/wav",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return errorResponse("SYS_001", "音声ファイルのアップロードに失敗しました", 500);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("audio-chunks")
      .getPublicUrl(audioPath);

    const audioUrl = urlData.publicUrl;

    // Parse and save transcript
    let transcriptData: TranscriptData;
    try {
      transcriptData = JSON.parse(transcriptsJson) as TranscriptData;
    } catch {
      return errorResponse("VAL_003", "文字起こしデータの形式が不正です", 400);
    }

    // Save to transcripts table (speaker will be assigned by diarization callback to speaker_segments)
    // transcripts table uses seconds (NUMERIC), not milliseconds
    const { data: transcript, error: transcriptError } = await supabase
      .from("transcripts")
      .upsert({
        session_id: sessionId,
        chunk_index: chunkIndex,
        text: transcriptData.text,
        start_time: transcriptData.startTime, // seconds as NUMERIC
        end_time: transcriptData.endTime, // seconds as NUMERIC
        audio_url: audioUrl,
      }, { onConflict: 'session_id,chunk_index' })
      .select()
      .single();

    if (transcriptError) {
      console.error("Transcript save error:", transcriptError);
      return errorResponse("DB_001", "文字起こしの保存に失敗しました", 500);
    }

    // Trigger speaker diarization
    let diarizationTriggered = false;
    if (PYANNOTE_SERVER && PYANNOTE_API_KEY) {
      try {
        const callbackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/diarization-callback`;

        const diarizeForm = new FormData();
        diarizeForm.append("audio", audioFile);
        diarizeForm.append("callback_url", callbackUrl);
        diarizeForm.append("num_speakers", "2");
        diarizeForm.append("session_id", sessionId);
        diarizeForm.append("chunk_index", chunkIndex.toString());

        const diarizeResponse = await fetch(`${PYANNOTE_SERVER}/diarize`, {
          method: "POST",
          headers: {
            "X-API-Key": PYANNOTE_API_KEY,
          },
          body: diarizeForm,
        });

        if (diarizeResponse.ok) {
          diarizationTriggered = true;
          // Note: Session status remains "recording" until end-session is called
          // Only the diarization callback will update speaker info, not session status
        } else {
          console.error("Diarization trigger failed:", await diarizeResponse.text());
        }
      } catch (diarizeError) {
        console.error("Diarization error:", diarizeError);
        // Diarization failure is not fatal - continue without it
      }
    }

    return jsonResponse(
      {
        transcriptId: transcript.id,
        audioUrl,
        diarizationTriggered,
      },
      200
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return errorResponse("SYS_001", "システムエラーが発生しました", 500);
  }
});
