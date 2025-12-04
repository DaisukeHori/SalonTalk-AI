/**
 * Trigger Diarization Edge Function
 * 話者分離トリガー関数
 *
 * Audio chunk uploaded → Trigger pyannote diarization
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { jsonResponse, errorResponse, unauthorizedResponse } from '../_shared/response.ts';
import { createSupabaseClient, createSupabaseAdminClient } from '../_shared/supabase.ts';
import { submitDiarization } from '../_shared/pyannote.ts';

interface TriggerDiarizationRequest {
  sessionId: string;
  audioChunkId: string;
  audioUrl: string;
  chunkIndex: number;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Authenticate request
    const supabase = createSupabaseClient(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedResponse();
    }

    // Parse and validate request
    const body: TriggerDiarizationRequest = await req.json();

    if (!body.sessionId || !body.audioChunkId || !body.audioUrl) {
      return errorResponse('VAL_001', 'sessionId, audioChunkId, and audioUrl are required', 400);
    }

    const { sessionId, audioChunkId, audioUrl, chunkIndex } = body;

    // Verify session exists and belongs to user
    const supabaseAdmin = createSupabaseAdminClient();
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id, status, stylist_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return errorResponse('NOT_FOUND', 'Session not found', 404);
    }

    if (session.status !== 'recording') {
      return errorResponse('INVALID_STATUS', 'Session is not in recording state', 400);
    }

    // Update audio chunk status to processing
    await supabaseAdmin
      .from('audio_chunks')
      .update({ status: 'processing' })
      .eq('id', audioChunkId);

    // Trigger diarization via pyannote server
    const diarizationResult = await submitDiarization({
      sessionId,
      chunkIndex: chunkIndex || 0,
      audioUrl,
      callbackUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/diarization-callback`,
    });

    // Store job ID for tracking
    await supabaseAdmin
      .from('audio_chunks')
      .update({
        diarization_job_id: diarizationResult.jobId,
        status: 'diarizing',
      })
      .eq('id', audioChunkId);

    return jsonResponse({
      success: true,
      jobId: diarizationResult.jobId,
      message: 'Diarization triggered successfully',
    });
  } catch (error) {
    console.error('Trigger diarization error:', error);

    return errorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
});
