/**
 * Complete Salon Setup Edge Function
 * POST /complete-salon-setup
 *
 * Marks salon setup as complete and saves all settings
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { createSupabaseClient, getUser, getStaff } from '../_shared/supabase.ts';
import { jsonResponse, errorResponse, unauthorizedResponse } from '../_shared/response.ts';

interface CompleteSalonSetupRequest {
  salon_info: {
    name: string;
    address?: string;
    phone?: string;
    business_hours?: {
      open: string;
      close: string;
    };
  };
  plan: 'free' | 'standard' | 'premium';
  privacy_settings: {
    require_customer_consent: boolean;
    consent_message?: string;
    data_retention_days: number;
    auto_delete_audio: boolean;
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

    // Check permission - only owner/admin can complete salon setup
    if (!['owner', 'admin'].includes(staff.role)) {
      return errorResponse('PERMISSION_DENIED', 'Only salon owner or admin can complete setup', 403);
    }

    // Parse request body
    const body: CompleteSalonSetupRequest = await req.json();

    // Validate required fields
    if (!body.salon_info?.name) {
      return errorResponse('VALIDATION_ERROR', 'Salon name is required', 400);
    }

    // Build settings object
    const currentSettings = staff.salon?.settings ?? {};
    const newSettings = {
      ...currentSettings,
      business_hours: body.salon_info.business_hours,
      privacy: body.privacy_settings,
    };

    // Update salon
    const { error: updateError } = await supabase
      .from('salons')
      .update({
        name: body.salon_info.name,
        address: body.salon_info.address,
        phone: body.salon_info.phone,
        plan: body.plan,
        settings: newSettings,
        setup_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', staff.salon_id);

    if (updateError) {
      console.error('Failed to update salon:', updateError);
      return errorResponse('UPDATE_ERROR', 'Failed to update salon', 500);
    }

    // Delete setup progress
    await supabase
      .from('setup_progress')
      .delete()
      .eq('user_id', user.id);

    return jsonResponse({
      success: true,
      message: 'Salon setup completed successfully',
    });
  } catch (error) {
    console.error('Error in complete-salon-setup:', error);

    if (error.message === 'Unauthorized') {
      return unauthorizedResponse();
    }

    return errorResponse('INTERNAL_ERROR', error.message, 500);
  }
});
