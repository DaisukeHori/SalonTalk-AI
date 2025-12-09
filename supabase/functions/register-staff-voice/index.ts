/**
 * register-staff-voice Edge Function
 *
 * Registers or updates staff voice embedding for automatic identification.
 * Called after pyannote extracts embedding from recorded audio.
 * Requires authentication.
 *
 * POST /register-staff-voice
 * Body: {
 *   embedding: number[],       // 512-dimensional voice embedding from pyannote
 *   is_additional?: boolean,   // If true, merge with existing embedding
 *   quality_score?: number     // Optional quality score from pyannote (0-100)
 * }
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

interface RegisterVoiceRequest {
  embedding: number[];
  is_additional?: boolean;
  quality_score?: number;
}

const EMBEDDING_DIMENSION = 512;
const MIN_QUALITY_SCORE = 50; // Minimum quality to accept

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

    const body: RegisterVoiceRequest = await req.json();

    // Validate embedding
    if (!body.embedding || !Array.isArray(body.embedding)) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: embedding (must be array)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (body.embedding.length !== EMBEDDING_DIMENSION) {
      return new Response(
        JSON.stringify({
          error: `Invalid embedding dimension: expected ${EMBEDDING_DIMENSION}, got ${body.embedding.length}`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check quality score if provided
    if (body.quality_score !== undefined && body.quality_score < MIN_QUALITY_SCORE) {
      return new Response(
        JSON.stringify({
          error: `Voice quality too low: ${body.quality_score}. Minimum required: ${MIN_QUALITY_SCORE}`
        }),
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

    // Create service client for RPC call
    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Convert embedding array to PostgreSQL vector format string
    const embeddingVector = `[${body.embedding.join(',')}]`;

    // Register voice embedding
    const { data: result, error: rpcError } = await serviceSupabase.rpc(
      'register_staff_voice',
      {
        staff_id_param: user.id,
        embedding_param: embeddingVector,
        is_additional: body.is_additional || false,
      }
    );

    if (rpcError) {
      console.error('Voice registration error:', rpcError);
      return new Response(
        JSON.stringify({ error: 'Failed to register voice', details: rpcError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const registration = result?.[0];

    if (!registration?.success) {
      return new Response(
        JSON.stringify({
          success: false,
          message: registration?.message || 'Voice registration failed'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        sample_count: registration.sample_count,
        message: registration.message,
        quality_score: body.quality_score,
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
