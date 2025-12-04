/**
 * Create Session Edge Function
 * POST /create-session
 *
 * Creates a new recording session for a stylist
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { createSupabaseClient, getUser, getStaff } from '../_shared/supabase.ts';
import { jsonResponse, errorResponse, unauthorizedResponse } from '../_shared/response.ts';

interface CreateSessionRequest {
  stylistId?: string;
  customerInfo?: {
    name?: string;
    ageGroup?: string;
    gender?: string;
    visitType: 'new' | 'repeat';
    notes?: string;
  };
}

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = createSupabaseClient(req);

    // Verify authentication
    const user = await getUser(supabase);
    const staff = await getStaff(supabase, user.id);

    // Parse request body
    const body: CreateSessionRequest = await req.json();

    // Check for existing active session
    const { data: activeSession } = await supabase
      .from('sessions')
      .select('id')
      .eq('stylist_id', staff.id)
      .eq('status', 'recording')
      .single();

    if (activeSession) {
      return errorResponse('SES_004', 'Active session already exists', 400, {
        activeSessionId: activeSession.id,
      });
    }

    // Create new session
    const { data: session, error: createError } = await supabase
      .from('sessions')
      .insert({
        salon_id: staff.salon_id,
        stylist_id: staff.id,
        status: 'recording',
        customer_info: body.customerInfo ?? { visitType: 'repeat' },
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError || !session) {
      console.error('Failed to create session:', createError);
      return errorResponse('SES_003', 'Failed to create session', 500);
    }

    // Create realtime channel name
    const realtimeChannel = `session:${session.id}`;

    return jsonResponse({
      sessionId: session.id,
      status: session.status,
      realtimeChannel,
      startedAt: session.started_at,
    });
  } catch (error) {
    console.error('Error in create-session:', error);

    if (error.message === 'Unauthorized') {
      return unauthorizedResponse();
    }

    return errorResponse('INTERNAL_ERROR', error.message, 500);
  }
});
