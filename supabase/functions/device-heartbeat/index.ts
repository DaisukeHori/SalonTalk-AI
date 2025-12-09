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

    // Update last_active_at for the device
    const { data: device, error: updateError } = await supabase
      .from('devices')
      .update({ last_active_at: new Date().toISOString() })
      .eq('device_identifier', body.device_identifier)
      .eq('status', 'active')
      .select('id, device_name, salon_id')
      .single();

    if (updateError || !device) {
      // Device not found or not active
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Device not found or not active',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        device_id: device.id,
        timestamp: new Date().toISOString(),
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
