/**
 * Complete Staff Setup Edge Function
 * POST /complete-staff-setup
 *
 * Marks staff setup as complete and saves profile
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { createSupabaseClient, getUser, getStaff } from '../_shared/supabase.ts';
import { jsonResponse, errorResponse, unauthorizedResponse } from '../_shared/response.ts';

interface CompleteStaffSetupRequest {
  profile: {
    display_name: string;
    avatar_url?: string;
  };
  permissions?: {
    microphone: boolean;
    notifications: boolean;
  };
  tutorial_completed?: boolean;
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
    const body: CompleteStaffSetupRequest = await req.json();

    // Validate required fields
    if (!body.profile?.display_name) {
      return errorResponse('VALIDATION_ERROR', 'Display name is required', 400);
    }

    // Update staff
    const { error: updateError } = await supabase
      .from('staffs')
      .update({
        name: body.profile.display_name,
        avatar_url: body.profile.avatar_url,
        setup_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', staff.id);

    if (updateError) {
      console.error('Failed to update staff:', updateError);
      return errorResponse('UPDATE_ERROR', 'Failed to update profile', 500);
    }

    // Delete setup progress
    await supabase
      .from('setup_progress')
      .delete()
      .eq('user_id', user.id);

    return jsonResponse({
      success: true,
      message: 'Staff setup completed successfully',
    });
  } catch (error) {
    console.error('Error in complete-staff-setup:', error);

    if (error.message === 'Unauthorized') {
      return unauthorizedResponse();
    }

    return errorResponse('INTERNAL_ERROR', error.message, 500);
  }
});
