/**
 * update-device Edge Function
 *
 * Updates device information (name, seat_number, status).
 * Requires authentication (owner or manager role).
 *
 * PATCH /update-device
 * Body: {
 *   device_id: string,
 *   device_name?: string,
 *   seat_number?: number | null,
 *   status?: 'active' | 'inactive' | 'pending',
 *   reason?: string  // For status/seat changes (audit log)
 * }
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

interface UpdateDeviceRequest {
  device_id: string;
  device_name?: string;
  seat_number?: number | null;
  status?: 'active' | 'inactive' | 'pending';
  reason?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'PATCH' && req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: UpdateDeviceRequest = await req.json();

    // Validate required fields
    if (!body.device_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: device_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate status if provided
    if (body.status && !['active', 'inactive', 'pending'].includes(body.status)) {
      return new Response(
        JSON.stringify({ error: 'Invalid status. Must be active, inactive, or pending.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's auth context
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get staff info including role
    const { data: staff, error: staffError } = await supabase
      .from('staffs')
      .select('id, salon_id, role')
      .eq('id', user.id)
      .single();

    if (staffError || !staff) {
      return new Response(
        JSON.stringify({ error: 'Staff not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check role permission
    if (!['owner', 'manager'].includes(staff.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions. Only owner or manager can update devices.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create service client for updates
    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify device exists and belongs to the same salon
    const { data: device, error: deviceError } = await serviceSupabase
      .from('devices')
      .select('*')
      .eq('id', body.device_id)
      .eq('salon_id', staff.salon_id)
      .single();

    if (deviceError || !device) {
      return new Response(
        JSON.stringify({ error: 'Device not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // Handle device name update
    if (body.device_name !== undefined && body.device_name !== device.device_name) {
      updates.device_name = body.device_name;
    }

    // Handle status update with state transition validation
    if (body.status !== undefined && body.status !== device.status) {
      // Validate state transitions
      const validTransitions: Record<string, string[]> = {
        'pending': ['active', 'inactive'],
        'active': ['inactive', 'pending'],
        'inactive': ['active', 'pending'],
        'revoked': [],  // Cannot transition from revoked (use different endpoint)
      };

      if (!validTransitions[device.status]?.includes(body.status)) {
        return new Response(
          JSON.stringify({
            error: 'Invalid status transition',
            message: `Cannot change status from ${device.status} to ${body.status}`,
            current_status: device.status,
            requested_status: body.status,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      updates.status = body.status;

      // If setting to pending, clear device_identifier (requires re-activation)
      if (body.status === 'pending') {
        updates.device_identifier = null;
        updates.activated_at = null;
        updates.activated_by = null;
      }
    }

    // Handle seat_number update using RPC for audit trail
    let seatUpdateResult = null;
    if (body.seat_number !== undefined && body.seat_number !== device.seat_number) {
      const { data: seatResult, error: seatError } = await serviceSupabase.rpc(
        'update_device_seat',
        {
          device_id_param: body.device_id,
          new_seat_number_param: body.seat_number,
          changed_by_param: staff.id,
          reason_param: body.reason || null,
        }
      );

      if (seatError) {
        console.error('Seat update error:', seatError);
        return new Response(
          JSON.stringify({ error: 'Failed to update seat number', details: seatError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      seatUpdateResult = seatResult?.[0];
      if (seatUpdateResult && !seatUpdateResult.success) {
        return new Response(
          JSON.stringify({
            error: 'Seat update failed',
            message: seatUpdateResult.message,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Apply remaining updates (name, status)
    if (Object.keys(updates).length > 1) {  // > 1 because updated_at is always present
      const { error: updateError } = await serviceSupabase
        .from('devices')
        .update(updates)
        .eq('id', body.device_id);

      if (updateError) {
        // Handle unique constraint violations
        if (updateError.code === '23505') {
          return new Response(
            JSON.stringify({ error: 'Device name already exists in this salon' }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw updateError;
      }
    }

    // Fetch updated device
    const { data: updatedDevice, error: fetchError } = await serviceSupabase
      .from('devices')
      .select('*')
      .eq('id', body.device_id)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    // If status changed to pending, generate new activation code
    let activationCode = null;
    if (body.status === 'pending') {
      const { data: codeResult, error: codeError } = await serviceSupabase.rpc(
        'generate_activation_code',
        {
          device_id_param: body.device_id,
          created_by_param: staff.id,
          validity_hours: 24,
        }
      );

      if (!codeError && codeResult?.[0]) {
        activationCode = {
          code: codeResult[0].activation_code,
          expires_at: codeResult[0].expires_at,
        };
      }
    }

    return new Response(
      JSON.stringify({
        device: updatedDevice,
        activation_code: activationCode,
        seat_update: seatUpdateResult,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
