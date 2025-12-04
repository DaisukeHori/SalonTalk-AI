/**
 * Register Push Token Edge Function
 * POST /register-push-token
 *
 * Registers or updates a push notification token for a device
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { createSupabaseClient, getUser, getStaff } from '../_shared/supabase.ts';
import { jsonResponse, errorResponse, unauthorizedResponse } from '../_shared/response.ts';

interface RegisterPushTokenRequest {
  token: string;
  platform: 'ios' | 'android';
  deviceId?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = createSupabaseClient(req);

    // Verify authentication
    const user = await getUser(supabase);
    const staff = await getStaff(supabase, user.id);

    // Parse request body
    const body: RegisterPushTokenRequest = await req.json();

    if (!body.token) {
      return errorResponse('VAL_001', 'token is required', 400);
    }

    if (!body.platform || !['ios', 'android', 'web'].includes(body.platform)) {
      return errorResponse('VAL_001', 'platform must be ios, android, or web', 400);
    }

    // Validate Expo push token format
    if (!body.token.startsWith('ExponentPushToken[') && !body.token.startsWith('ExpoPushToken[')) {
      return errorResponse('VAL_002', 'Invalid push token format', 400);
    }

    // Upsert push token (update if same token exists, insert otherwise)
    const { data: existingToken, error: checkError } = await supabase
      .from('push_tokens')
      .select('id')
      .eq('token', body.token)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing token:', checkError);
      return errorResponse('DB_001', 'Failed to check existing token', 500);
    }

    if (existingToken) {
      // Update existing token
      const { error: updateError } = await supabase
        .from('push_tokens')
        .update({
          staff_id: staff.id,
          platform: body.platform,
          device_id: body.deviceId || null,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingToken.id);

      if (updateError) {
        console.error('Error updating push token:', updateError);
        return errorResponse('DB_001', 'Failed to update push token', 500);
      }

      return jsonResponse({
        success: true,
        message: 'Push token updated',
        tokenId: existingToken.id,
      });
    } else {
      // Insert new token
      const { data: newToken, error: insertError } = await supabase
        .from('push_tokens')
        .insert({
          staff_id: staff.id,
          token: body.token,
          platform: body.platform,
          device_id: body.deviceId || null,
          is_active: true,
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Error inserting push token:', insertError);
        return errorResponse('DB_001', 'Failed to register push token', 500);
      }

      return jsonResponse({
        success: true,
        message: 'Push token registered',
        tokenId: newToken.id,
      });
    }
  } catch (error) {
    console.error('Error in register-push-token:', error);

    if (error.message === 'Unauthorized') {
      return unauthorizedResponse();
    }

    return errorResponse('INTERNAL_ERROR', error.message, 500);
  }
});
