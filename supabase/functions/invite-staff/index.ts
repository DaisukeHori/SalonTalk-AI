/**
 * Invite Staff Edge Function
 * POST /invite-staff
 *
 * Sends an invitation email to a new staff member
 * Uses Supabase Auth inviteUserByEmail to create invitation
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { createSupabaseClient, createSupabaseAdminClient, getUser } from '../_shared/supabase.ts';
import { jsonResponse, errorResponse, unauthorizedResponse } from '../_shared/response.ts';

interface InviteStaffRequest {
  email: string;
  displayName: string;
  role: 'stylist' | 'manager' | 'owner';
  salonId?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = createSupabaseClient(req);
    const adminClient = createSupabaseAdminClient();

    // Verify authentication
    const user = await getUser(supabase);

    // Get current user's staff record to verify permissions
    const { data: currentStaff, error: staffError } = await supabase
      .from('staffs')
      .select('salon_id, role')
      .eq('id', user.id)
      .single();

    if (staffError || !currentStaff) {
      return errorResponse('AUTH_003', 'Staff record not found', 403);
    }

    // Only owners and managers can invite staff
    if (!['owner', 'manager'].includes(currentStaff.role)) {
      return errorResponse('AUTH_003', 'Permission denied. Only owners and managers can invite staff.', 403);
    }

    // Parse request body
    const body: InviteStaffRequest = await req.json();

    if (!body.email || !body.displayName || !body.role) {
      return errorResponse('VAL_001', 'Missing required fields: email, displayName, role', 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return errorResponse('VAL_002', 'Invalid email format', 400);
    }

    // Validate role
    if (!['stylist', 'manager', 'owner'].includes(body.role)) {
      return errorResponse('VAL_002', 'Invalid role. Must be stylist, manager, or owner', 400);
    }

    const salonId = body.salonId || currentStaff.salon_id;

    // Check if user already exists in auth
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === body.email);

    if (existingUser) {
      // Check if already a staff member
      const { data: existingStaff } = await adminClient
        .from('staffs')
        .select('id')
        .eq('id', existingUser.id)
        .single();

      if (existingStaff) {
        return errorResponse('DB_004', 'This email is already registered as a staff member', 409);
      }

      // User exists but not a staff member - create staff record
      const { error: createError } = await adminClient
        .from('staffs')
        .insert({
          id: existingUser.id,
          salon_id: salonId,
          email: body.email,
          display_name: body.displayName,
          role: body.role,
          is_active: true,
        });

      if (createError) {
        console.error('Error creating staff record:', createError);
        return errorResponse('DB_003', 'Failed to create staff record', 500);
      }

      return jsonResponse({
        success: true,
        message: 'Staff record created for existing user',
        staffId: existingUser.id,
      });
    }

    // Invite new user via Supabase Auth
    const appUrl = Deno.env.get('APP_URL') || 'https://salontalk.app';
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      body.email,
      {
        data: {
          display_name: body.displayName,
          role: body.role,
          salon_id: salonId,
          invited_by: user.id,
        },
        redirectTo: `${appUrl}/auth/callback?type=invite`,
      }
    );

    if (inviteError) {
      console.error('Error inviting user:', inviteError);
      return errorResponse('AUTH_001', `Failed to send invitation: ${inviteError.message}`, 500);
    }

    // Create pending staff record
    const { error: staffCreateError } = await adminClient
      .from('staffs')
      .insert({
        id: inviteData.user.id,
        salon_id: salonId,
        email: body.email,
        display_name: body.displayName,
        role: body.role,
        is_active: false, // Will be activated when user accepts invitation
      });

    if (staffCreateError) {
      console.error('Error creating pending staff record:', staffCreateError);
      // Don't fail - the invitation was sent successfully
    }

    // Log the invitation
    await adminClient
      .from('invitation_logs')
      .insert({
        invited_email: body.email,
        invited_by: user.id,
        salon_id: salonId,
        role: body.role,
        status: 'sent',
      })
      .catch((err) => console.error('Failed to log invitation:', err));

    return jsonResponse({
      success: true,
      message: 'Invitation sent successfully',
      userId: inviteData.user.id,
      email: body.email,
    });
  } catch (error) {
    console.error('Error in invite-staff:', error);

    if (error.message === 'Unauthorized') {
      return unauthorizedResponse();
    }

    return errorResponse('INTERNAL_ERROR', error.message, 500);
  }
});
