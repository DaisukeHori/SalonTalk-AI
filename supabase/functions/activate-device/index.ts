/**
 * activate-device Edge Function
 *
 * Activates a device using a 6-digit activation code.
 * No authentication required - code serves as authentication.
 *
 * POST /activate-device
 * Body: { activation_code: string, device_identifier: string, metadata?: object }
 *
 * Response format (for mobile app):
 * { data: { success, device_id, device_identifier, salon_id, salon_name, device_name, seat_number } }
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

interface ActivationResult {
  success: boolean;
  device_id: string;
  device_identifier: string;
  salon_id: string;
  salon_name: string;
  device_name: string;
  seat_number: number | null;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: { message: 'Method not allowed' } }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body: ActivateDeviceRequest = await req.json();

    // Validate required fields
    if (!body.activation_code) {
      return new Response(
        JSON.stringify({ error: { message: 'アクティベーションコードを入力してください' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!body.device_identifier) {
      return new Response(
        JSON.stringify({ error: { message: 'デバイス識別子が必要です' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate activation code format (6 digits)
    if (!/^\d{6}$/.test(body.activation_code)) {
      return new Response(
        JSON.stringify({ error: { message: '無効なコード形式です（6桁の数字）' } }),
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
        JSON.stringify({ error: { message: 'アクティベーションに失敗しました' } }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const dbResult = data?.[0] as {
      success: boolean;
      device_id: string | null;
      salon_id: string | null;
      device_name: string | null;
      message: string;
    } | undefined;

    if (!dbResult || !dbResult.success) {
      // Map error messages to Japanese
      let errorMessage = 'アクティベーションに失敗しました';
      const msg = dbResult?.message?.toLowerCase() || '';

      if (msg.includes('invalid') || msg.includes('expired')) {
        errorMessage = '無効または期限切れのアクティベーションコードです';
      }

      return new Response(
        JSON.stringify({ error: { message: errorMessage } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch additional data (salon_name, seat_number)
    const { data: deviceData, error: deviceError } = await supabase
      .from('devices')
      .select(`
        seat_number,
        salons!inner (
          name
        )
      `)
      .eq('id', dbResult.device_id)
      .single();

    if (deviceError) {
      console.error('Device fetch error:', deviceError);
    }

    // Build response matching mobile app expectations
    const result: ActivationResult = {
      success: true,
      device_id: dbResult.device_id!,
      device_identifier: body.device_identifier,
      salon_id: dbResult.salon_id!,
      salon_name: (deviceData?.salons as { name: string })?.name || '',
      device_name: dbResult.device_name || '',
      seat_number: deviceData?.seat_number ?? null,
    };

    return new Response(
      JSON.stringify({ data: result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: { message: 'サーバーエラーが発生しました' } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
