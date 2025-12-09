/**
 * revoke-device Edge Function
 *
 * Permanently revokes a device. This is an irreversible operation.
 * Requires authentication (owner role only).
 *
 * POST /revoke-device
 * Body: {
 *   device_id: string,
 *   reason?: string  // Audit log reason
 * }
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

interface RevokeDeviceRequest {
  device_id: string;
  reason?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
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

    const body: RevokeDeviceRequest = await req.json();

    // Validate required fields
    if (!body.device_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: device_id' }),
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

    // Only owner can revoke devices (critical operation)
    if (staff.role !== 'owner') {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions. Only owner can revoke devices.' }),
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

    // Check if already revoked
    if (device.status === 'revoked') {
      return new Response(
        JSON.stringify({ error: 'Device is already revoked' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Revoke the device
    const { error: updateError } = await serviceSupabase
      .from('devices')
      .update({
        status: 'revoked',
        device_identifier: null,  // Clear identifier for security
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.device_id);

    if (updateError) {
      throw updateError;
    }

    // Invalidate all pending activation codes
    await serviceSupabase
      .from('device_activations')
      .update({ expires_at: new Date().toISOString() })
      .eq('device_id', body.device_id)
      .is('used_at', null);

    // Log to audit_logs
    await serviceSupabase
      .from('audit_logs')
      .insert({
        event_type: 'device_revoked',
        user_id: staff.id,
        salon_id: staff.salon_id,
        resource_type: 'device',
        resource_id: body.device_id,
        action: 'revoke',
        old_value: { status: device.status },
        new_value: { status: 'revoked', reason: body.reason },
      });

    return new Response(
      JSON.stringify({
        success: true,
        device_id: body.device_id,
        previous_status: device.status,
        new_status: 'revoked',
        message: 'Device has been permanently revoked',
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
