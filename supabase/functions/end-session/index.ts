/**
 * End Session Edge Function
 * POST /end-session
 *
 * Ends a recording session and triggers processing
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { createSupabaseClient, getUser } from '../_shared/supabase.ts';
import { jsonResponse, errorResponse, unauthorizedResponse, notFoundResponse } from '../_shared/response.ts';

interface EndSessionRequest {
  sessionId: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = createSupabaseClient(req);

    // Verify authentication
    await getUser(supabase);

    // Parse request body
    const body: EndSessionRequest = await req.json();

    if (!body.sessionId) {
      return errorResponse('VAL_001', 'sessionId is required', 400);
    }

    // Get session
    const { data: session, error: fetchError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', body.sessionId)
      .single();

    if (fetchError || !session) {
      return notFoundResponse('Session not found');
    }

    if (session.status !== 'recording') {
      return errorResponse('SES_002', 'Session is not recording', 400);
    }

    const endedAt = new Date();
    const totalDurationMs = endedAt.getTime() - new Date(session.started_at).getTime();

    // Update session status
    const { data: updatedSession, error: updateError } = await supabase
      .from('sessions')
      .update({
        status: 'processing',
        ended_at: endedAt.toISOString(),
        total_duration_ms: totalDurationMs,
        updated_at: endedAt.toISOString(),
      })
      .eq('id', body.sessionId)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update session:', updateError);
      return errorResponse('DB_002', 'Failed to end session', 500);
    }

    // Trigger report generation asynchronously
    const generateReportUrl = Deno.env.get('SUPABASE_URL') + '/functions/v1/generate-report';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Fire and forget - don't wait for report generation
    fetch(generateReportUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        sessionId: body.sessionId,
      }),
    }).catch((err) => {
      console.error('Failed to trigger report generation:', err);
    });

    return jsonResponse({
      session_id: updatedSession.id,
      status: updatedSession.status,
      ended_at: updatedSession.ended_at,
      total_duration_ms: totalDurationMs,
    });
  } catch (error) {
    console.error('Error in end-session:', error);

    if (error.message === 'Unauthorized') {
      return unauthorizedResponse();
    }

    return errorResponse('INTERNAL_ERROR', error.message, 500);
  }
});
