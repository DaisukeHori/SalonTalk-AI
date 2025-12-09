/**
 * activate-device Edge Function
 *
 * Activates a device using a 6-digit activation code.
 * No authentication required - code serves as authentication.
 *
 * POST /activate-device
 * Body: { activation_code: string, device_identifier: string, metadata?: object }
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

interface ActivateDeviceRequest {
  activation_code: string;
  device_identifier: string;
  metadata?: {
    os_version?: string;
    app_version?: string;
    model?: string;
  };
}

interface ActivateDeviceResponse {
  success: boolean;
  device_id: string | null;
  salon_id: string | null;
  device_name: string | null;
  message: string;
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
    const body: ActivateDeviceRequest = await req.json();

    // Validate required fields
    if (!body.activation_code || !body.device_identifier) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: activation_code, device_identifier'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate activation code format (6 digits)
    if (!/^\d{6}$/.test(body.activation_code)) {
      return new Response(
        JSON.stringify({ error: 'Invalid activation code format (must be 6 digits)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role for database access
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Call activate_device function
    const { data, error } = await supabase.rpc('activate_device', {
      activation_code_param: body.activation_code,
      device_identifier_param: body.device_identifier,
      metadata_param: body.metadata || {},
    });

    if (error) {
      console.error('Activation error:', error);
      return new Response(
        JSON.stringify({ error: 'Activation failed', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = data?.[0] as ActivateDeviceResponse | undefined;

    if (!result || !result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          message: result?.message || 'Invalid or expired activation code'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        device_id: result.device_id,
        salon_id: result.salon_id,
        device_name: result.device_name,
        message: result.message,
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
