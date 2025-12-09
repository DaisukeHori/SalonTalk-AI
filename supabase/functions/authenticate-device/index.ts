/**
 * authenticate-device Edge Function
 *
 * Authenticates a device on app startup using device identifier.
 * No user authentication required - device identifier serves as authentication.
 *
 * POST /authenticate-device
 * Body: { device_identifier: string }
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

interface AuthenticateDeviceRequest {
  device_identifier: string;
}

interface AuthenticateDeviceResponse {
  is_valid: boolean;
  device_id: string | null;
  salon_id: string | null;
  device_name: string | null;
  seat_number: number | null;
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
    const body: AuthenticateDeviceRequest = await req.json();

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

    // Call authenticate_device function
    const { data, error } = await supabase.rpc('authenticate_device', {
      device_identifier_param: body.device_identifier,
    });

    if (error) {
      console.error('Authentication error:', error);
      return new Response(
        JSON.stringify({ error: 'Authentication failed', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = data?.[0] as AuthenticateDeviceResponse | undefined;

    if (!result || !result.is_valid) {
      return new Response(
        JSON.stringify({
          is_valid: false,
          device_id: null,
          salon_id: null,
          device_name: null,
          seat_number: null,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        is_valid: true,
        device_id: result.device_id,
        salon_id: result.salon_id,
        device_name: result.device_name,
        seat_number: result.seat_number,
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
