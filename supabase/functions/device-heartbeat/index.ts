/**
 * device-heartbeat Edge Function
 *
 * Updates device last_active_at timestamp for online/offline status tracking.
 * Called periodically by iPad app (recommended: every 1-2 minutes).
 * No user authentication required - device identifier serves as authentication.
 *
 * POST /device-heartbeat
 * Body: { device_identifier: string }
 *
 * Online status determination:
 * - Online: last_active_at within 5 minutes
 * - Offline: last_active_at older than 5 minutes
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

interface HeartbeatRequest {
  device_identifier: string;
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
    const body: HeartbeatRequest = await req.json();

    // Validate required fields
    if (!body.device_identifier) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: device_identifier' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role for database access
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // First check if device exists and its status
    const { data: deviceInfo, error: deviceError } = await supabase
      .from('devices')
      .select('id, device_name, salon_id, status')
      .eq('device_identifier', body.device_identifier)
      .single();

    if (deviceError || !deviceInfo) {
      // Device not found
      return new Response(
        JSON.stringify({
          data: {
            success: false,
            message: 'Device not found',
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if device is revoked
    if (deviceInfo.status === 'revoked') {
      return new Response(
        JSON.stringify({
          data: {
            success: false,
            revoked: true,
            message: 'Device has been revoked',
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if device is not active
    if (deviceInfo.status !== 'active') {
      return new Response(
        JSON.stringify({
          data: {
            success: false,
            message: 'Device is not active',
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update last_active_at for active device
    const { error: updateError } = await supabase
      .from('devices')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', deviceInfo.id);

    if (updateError) {
      console.error('Heartbeat update error:', updateError);
    }

    return new Response(
      JSON.stringify({
        data: {
          success: true,
          device_id: deviceInfo.id,
          timestamp: new Date().toISOString(),
        }
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
