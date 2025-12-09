/**
 * extract-embedding Edge Function
 *
 * Extracts voice embedding from audio file via pyannote server.
 * Used for staff voice registration and identification.
 * Requires authentication.
 *
 * POST /extract-embedding
 * Content-Type: multipart/form-data
 * Body: {
 *   file: Blob,                 // Audio file (WAV, MP3, M4A)
 *   speaker_label?: string      // Optional: 'customer' | 'stylist' to extract specific speaker
 * }
 *
 * Response: {
 *   embedding: number[],        // 512-dimensional voice embedding
 *   duration_seconds: number,   // Audio duration
 *   confidence: number,         // Quality score (0-1)
 *   processing_time_ms: number  // Processing time
 * }
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

const EMBEDDING_DIMENSION = 512;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB max

interface EmbeddingResponse {
  embedding: number[];
  duration_seconds: number;
  confidence: number;
  processing_time_ms: number;
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

    // Parse multipart form data
    const contentType = req.headers.get('Content-Type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return new Response(
        JSON.stringify({ error: 'Content-Type must be multipart/form-data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const speakerLabel = formData.get('speaker_label') as string | null;

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: file' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file type
    const allowedTypes = ['audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/webm', 'audio/x-wav'];
    if (!allowedTypes.includes(file.type)) {
      return new Response(
        JSON.stringify({
          error: `Unsupported audio format: ${file.type}. Allowed: ${allowedTypes.join(', ')}`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate speaker_label if provided
    if (speakerLabel && !['customer', 'stylist'].includes(speakerLabel)) {
      return new Response(
        JSON.stringify({ error: 'speaker_label must be "customer" or "stylist"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get pyannote server URL
    const pyannoteServerUrl = Deno.env.get('PYANNOTE_SERVER_URL');
    if (!pyannoteServerUrl) {
      console.error('PYANNOTE_SERVER_URL not configured');
      return new Response(
        JSON.stringify({ error: 'Voice processing service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare form data for pyannote server
    const pyannoteFormData = new FormData();
    pyannoteFormData.append('file', file);
    if (speakerLabel) {
      pyannoteFormData.append('speaker_label', speakerLabel);
    }

    // Optional: Add API key if configured
    const pyannoteApiKey = Deno.env.get('PYANNOTE_API_KEY');
    const headers: Record<string, string> = {};
    if (pyannoteApiKey) {
      headers['X-API-Key'] = pyannoteApiKey;
    }

    // Call pyannote server
    console.log(`Forwarding embedding request to ${pyannoteServerUrl}/extract-embedding`);

    const pyannoteResponse = await fetch(`${pyannoteServerUrl}/extract-embedding`, {
      method: 'POST',
      headers,
      body: pyannoteFormData,
    });

    if (!pyannoteResponse.ok) {
      const errorText = await pyannoteResponse.text();
      console.error('Pyannote server error:', pyannoteResponse.status, errorText);
      return new Response(
        JSON.stringify({
          error: 'Voice processing failed',
          details: errorText,
        }),
        { status: pyannoteResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result: EmbeddingResponse = await pyannoteResponse.json();

    // Validate embedding dimension
    if (!result.embedding || result.embedding.length !== EMBEDDING_DIMENSION) {
      console.error(`Invalid embedding dimension: expected ${EMBEDDING_DIMENSION}, got ${result.embedding?.length}`);
      return new Response(
        JSON.stringify({
          error: 'Invalid embedding dimension from voice processor',
          expected: EMBEDDING_DIMENSION,
          received: result.embedding?.length,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate quality score (0-100) from confidence (0-1)
    const qualityScore = Math.round(result.confidence * 100);

    return new Response(
      JSON.stringify({
        embedding: result.embedding,
        duration_seconds: result.duration_seconds,
        confidence: result.confidence,
        quality_score: qualityScore,
        processing_time_ms: result.processing_time_ms,
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
