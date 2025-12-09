/**
 * register-device Edge Function
 *
 * Registers a new device for a salon.
 * Requires authentication (owner or manager role).
 *
 * POST /register-device
 * Body: { device_name: string, seat_number?: number }
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

interface RegisterDeviceRequest {
  device_name: string;
  seat_number?: number;
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

    const body: RegisterDeviceRequest = await req.json();

    // Validate required fields
    if (!body.device_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: device_name' }),
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
        JSON.stringify({ error: 'Insufficient permissions. Only owner or manager can register devices.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create device using service role to bypass RLS for insert
    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: device, error: insertError } = await serviceSupabase
      .from('devices')
      .insert({
        salon_id: staff.salon_id,
        device_name: body.device_name,
        seat_number: body.seat_number || null,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      // Handle unique constraint violations
      if (insertError.code === '23505') {
        const isNameDuplicate = insertError.message.includes('device_name');
        const isSeatDuplicate = insertError.message.includes('seat_number');
        return new Response(
          JSON.stringify({
            error: isNameDuplicate
              ? 'Device name already exists in this salon'
              : isSeatDuplicate
              ? 'Seat number already assigned to another device'
              : 'Duplicate entry',
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw insertError;
    }

    // Generate activation code
    const { data: codeResult, error: codeError } = await serviceSupabase.rpc(
      'generate_activation_code',
      {
        device_id_param: device.id,
        created_by_param: staff.id,
        validity_hours: 24,
      }
    );

    if (codeError) {
      console.error('Activation code generation error:', codeError);
      // Device was created but code generation failed - still return device info
      return new Response(
        JSON.stringify({
          device_id: device.id,
          device_name: device.device_name,
          status: device.status,
          activation_code: null,
          expires_at: null,
          warning: 'Device created but activation code generation failed',
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const code = codeResult?.[0];

    return new Response(
      JSON.stringify({
        device_id: device.id,
        device_name: device.device_name,
        seat_number: device.seat_number,
        status: device.status,
        activation_code: code?.activation_code,
        expires_at: code?.expires_at,
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
