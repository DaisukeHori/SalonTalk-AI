/**
 * Save Setup Progress Edge Function
 * POST /save-setup-progress
 *
 * Saves the current wizard step progress
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { createSupabaseClient, getUser } from '../_shared/supabase.ts';
import { jsonResponse, errorResponse, unauthorizedResponse } from '../_shared/response.ts';

interface SaveProgressRequest {
  user_type: 'salon' | 'staff';
  current_step: number;
  completed_steps: number[];
  step_data: Record<string, unknown>;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = createSupabaseClient(req);

    // Verify authentication
    const user = await getUser(supabase);

    // Parse request body
    const body: SaveProgressRequest = await req.json();

    // Validate request
    if (!body.user_type || typeof body.current_step !== 'number') {
      return errorResponse('VALIDATION_ERROR', 'user_type and current_step are required', 400);
    }

    // Upsert progress
    const { data: progress, error } = await supabase
      .from('setup_progress')
      .upsert({
        user_id: user.id,
        user_type: body.user_type,
        current_step: body.current_step,
        completed_steps: body.completed_steps ?? [],
        step_data: body.step_data ?? {},
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to save progress:', error);
      return errorResponse('SAVE_ERROR', 'Failed to save progress', 500);
    }

    return jsonResponse({
      success: true,
      progress: {
        current_step: progress.current_step,
        completed_steps: progress.completed_steps,
        step_data: progress.step_data,
        updated_at: progress.updated_at,
      },
    });
  } catch (error) {
    console.error('Error in save-setup-progress:', error);

    if (error.message === 'Unauthorized') {
      return unauthorizedResponse();
    }

    return errorResponse('INTERNAL_ERROR', error.message, 500);
  }
});
