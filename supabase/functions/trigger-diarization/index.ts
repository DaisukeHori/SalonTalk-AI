/**
 * Trigger Diarization Edge Function
 * 話者分離トリガー関数
 *
 * Audio chunk uploaded → Trigger pyannote diarization
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { getSupabaseClient, getSupabaseAdmin } from '../_shared/supabase.ts';
import { triggerDiarization } from '../_shared/pyannote.ts';
import { validateRequest, ValidationError } from '../_shared/validation.ts';

interface DiarizationRequest {
  sessionId: string;
  audioChunkId: string;
  audioUrl: string;
  chunkIndex: number;
}

const requestSchema = {
  sessionId: { type: 'string', required: true },
  audioChunkId: { type: 'string', required: true },
  audioUrl: { type: 'string', required: true },
  chunkIndex: { type: 'number', required: true },
} as const;

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCors();
  }

  try {
    // Authenticate request
    const supabase = getSupabaseClient(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse('Unauthorized', 401);
    }

    // Parse and validate request
    const body = await req.json();
    const validatedData = validateRequest<DiarizationRequest>(body, requestSchema);

    const { sessionId, audioChunkId, audioUrl, chunkIndex } = validatedData;

    // Verify session exists and belongs to user
    const supabaseAdmin = getSupabaseAdmin();
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id, status, staff_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return errorResponse('Session not found', 404);
    }

    if (session.status !== 'recording') {
      return errorResponse('Session is not in recording state', 400);
    }

    // Update audio chunk status to processing
    await supabaseAdmin
      .from('audio_chunks')
      .update({ status: 'processing' })
      .eq('id', audioChunkId);

    // Trigger diarization via pyannote server
    const diarizationResult = await triggerDiarization({
      audioUrl,
      callbackUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/diarization-callback`,
      metadata: {
        sessionId,
        audioChunkId,
        chunkIndex,
        staffId: session.staff_id,
      },
    });

    // Store job ID for tracking
    await supabaseAdmin
      .from('audio_chunks')
      .update({
        diarization_job_id: diarizationResult.jobId,
        status: 'diarizing',
      })
      .eq('id', audioChunkId);

    return successResponse({
      success: true,
      jobId: diarizationResult.jobId,
      message: 'Diarization triggered successfully',
    });
  } catch (error) {
    console.error('Trigger diarization error:', error);

    if (error instanceof ValidationError) {
      return errorResponse(error.message, 400);
    }

    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
});
