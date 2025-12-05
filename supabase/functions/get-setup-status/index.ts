/**
 * Get Setup Status Edge Function
 * GET /get-setup-status
 *
 * Returns the setup status for the authenticated user
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { createSupabaseClient, getUser } from '../_shared/supabase.ts';
import { jsonResponse, errorResponse, unauthorizedResponse } from '../_shared/response.ts';

interface SetupStatusResponse {
  needs_setup: boolean;
  user_type: 'salon' | 'staff' | 'unknown';
  current_step: number;
  setup_completed: boolean;
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

    // Get staff info with salon
    const { data: staff, error: staffError } = await supabase
      .from('staffs')
      .select('*, salon:salons(*)')
      .eq('id', user.id)
      .single();

    if (staffError || !staff) {
      // User is not a staff member yet - likely a new signup
      return jsonResponse({
        needs_setup: true,
        user_type: 'unknown',
        current_step: 1,
        setup_completed: false,
        completed_steps: [],
        step_data: {},
      } as SetupStatusResponse);
    }

    // Get setup progress if exists
    const { data: progress } = await supabase
      .from('setup_progress')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Determine user type and setup status
    const isOwnerOrAdmin = ['owner', 'admin'].includes(staff.role);
    const salonSetupCompleted = staff.salon?.setup_completed ?? false;
    const staffSetupCompleted = staff.setup_completed ?? false;

    // Owner/admin needs to complete salon setup first
    if (isOwnerOrAdmin && !salonSetupCompleted) {
      return jsonResponse({
        needs_setup: true,
        user_type: 'salon',
        current_step: progress?.current_step ?? 1,
        setup_completed: false,
        completed_steps: progress?.completed_steps ?? [],
        step_data: progress?.step_data ?? {},
      } as SetupStatusResponse);
    }

    // Staff needs to complete personal setup
    if (!staffSetupCompleted) {
      return jsonResponse({
        needs_setup: true,
        user_type: 'staff',
        current_step: progress?.current_step ?? 1,
        setup_completed: false,
        completed_steps: progress?.completed_steps ?? [],
        step_data: progress?.step_data ?? {},
      } as SetupStatusResponse);
    }

    // All setup completed
    return jsonResponse({
      needs_setup: false,
      user_type: isOwnerOrAdmin ? 'salon' : 'staff',
      current_step: 0,
      setup_completed: true,
      completed_steps: [],
      step_data: {},
    } as SetupStatusResponse);
  } catch (error) {
    console.error('Error in get-setup-status:', error);

    if (error.message === 'Unauthorized') {
      return unauthorizedResponse();
    }

    return errorResponse('INTERNAL_ERROR', error.message, 500);
  }
});
