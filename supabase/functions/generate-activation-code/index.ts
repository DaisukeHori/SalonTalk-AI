/**
 * generate-activation-code Edge Function
 *
 * Generates a new 6-digit activation code for an existing device.
 * Requires authentication (owner or manager role).
 *
 * POST /generate-activation-code
 * Body: { device_id: string }
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

interface GenerateCodeRequest {
  device_id: string;
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

    const body: GenerateCodeRequest = await req.json();

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

    // Check role permission
    if (!['owner', 'manager'].includes(staff.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions. Only owner or manager can generate activation codes.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify device belongs to same salon
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('id, device_name, salon_id')
      .eq('id', body.device_id)
      .eq('salon_id', staff.salon_id)
      .single();

    if (deviceError || !device) {
      return new Response(
        JSON.stringify({ error: 'Device not found or does not belong to your salon' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate activation code using service role
    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: codeResult, error: codeError } = await serviceSupabase.rpc(
      'generate_activation_code',
      {
        device_id_param: body.device_id,
        created_by_param: staff.id,
        validity_hours: 24,
      }
    );

    if (codeError) {
      console.error('Activation code generation error:', codeError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate activation code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const code = codeResult?.[0];

    return new Response(
      JSON.stringify({
        device_id: body.device_id,
        device_name: device.device_name,
        activation_code: code?.activation_code,
        expires_at: code?.expires_at,
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
