/**
 * identify-staff Edge Function
 *
 * Identifies staff from speaker embeddings extracted during session.
 * Called after pyannote diarization with extract_embeddings=true.
 * Updates session with identified stylist_id and confidence.
 *
 * POST /identify-staff
 * Body: {
 *   session_id: string,
 *   speaker_embeddings: {
 *     label: string,           // "SPEAKER_00" | "SPEAKER_01"
 *     embedding: number[],     // 512-dimensional vector
 *     duration_ms: number      // Speech duration in milliseconds
 *   }[]
 * }
 *
 * Identification logic:
 * 1. Match each speaker's embedding against registered staff voices
 * 2. Speaker with longer duration is assumed to be the stylist
 * 3. Cross-check: longer-speaking speaker should match staff
 * 4. Return confidence level based on similarity threshold:
 *    - high (>= 0.85): auto-assign staff
 *    - medium (0.75-0.85): assign with confirmation request
 *    - low (0.65-0.75): assign with confirmation required
 *    - none (< 0.65): manual selection required
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

interface SpeakerEmbedding {
  label: string;
  embedding: number[];
  duration_ms: number;
}

interface IdentifyStaffRequest {
  session_id: string;
  speaker_embeddings: SpeakerEmbedding[];
}

interface StaffMatch {
  staff_id: string;
  name: string;
  similarity: number;
  confidence_level: 'high' | 'medium' | 'low' | 'none';
}

const EMBEDDING_DIMENSION = 512;

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
    const body: IdentifyStaffRequest = await req.json();

    // Validate required fields
    if (!body.session_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: session_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!body.speaker_embeddings || !Array.isArray(body.speaker_embeddings) || body.speaker_embeddings.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing or empty speaker_embeddings array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate embeddings
    for (const speaker of body.speaker_embeddings) {
      if (!speaker.embedding || speaker.embedding.length !== EMBEDDING_DIMENSION) {
        return new Response(
          JSON.stringify({
            error: `Invalid embedding for ${speaker.label}: expected ${EMBEDDING_DIMENSION} dimensions`
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get session to find salon_id
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, salon_id, stylist_id')
      .eq('id', body.session_id)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Session not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If stylist already identified, skip
    if (session.stylist_id) {
      return new Response(
        JSON.stringify({
          identified: true,
          stylist_id: session.stylist_id,
          message: 'Stylist already identified',
          requires_confirmation: false,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sort speakers by duration (longest first - assumed to be stylist)
    const sortedSpeakers = [...body.speaker_embeddings].sort(
      (a, b) => b.duration_ms - a.duration_ms
    );

    let bestMatch: StaffMatch | null = null;
    let matchedSpeaker: SpeakerEmbedding | null = null;

    // Try to match each speaker, prioritizing longest speaker
    for (const speaker of sortedSpeakers) {
      const embeddingVector = `[${speaker.embedding.join(',')}]`;

      const { data: matches, error: matchError } = await supabase.rpc(
        'match_staff_by_voice',
        {
          query_embedding: embeddingVector,
          salon_id_param: session.salon_id,
          match_threshold: 0.65,
          match_count: 1,
        }
      );

      if (matchError) {
        console.error('Match error:', matchError);
        continue;
      }

      if (matches && matches.length > 0) {
        const match = matches[0];
        // Use the best match (highest similarity)
        if (!bestMatch || match.similarity > bestMatch.similarity) {
          bestMatch = {
            staff_id: match.staff_id,
            name: match.name,
            similarity: match.similarity,
            confidence_level: match.confidence_level as 'high' | 'medium' | 'low',
          };
          matchedSpeaker = speaker;
        }
      }
    }

    // Determine identification result
    if (bestMatch) {
      const requiresConfirmation = bestMatch.confidence_level !== 'high';

      // Update session with identified staff
      const { error: updateError } = await supabase
        .from('sessions')
        .update({
          stylist_id: bestMatch.staff_id,
          stylist_match_confidence: bestMatch.similarity,
          updated_at: new Date().toISOString(),
        })
        .eq('id', body.session_id);

      if (updateError) {
        console.error('Session update error:', updateError);
        // Continue anyway - identification succeeded
      }

      // Broadcast staff identified event via Realtime
      await supabase
        .channel(`session:${body.session_id}`)
        .send({
          type: 'broadcast',
          event: 'staff_identified',
          payload: {
            stylist_id: bestMatch.staff_id,
            stylist_name: bestMatch.name,
            confidence: bestMatch.similarity,
            confidence_level: bestMatch.confidence_level,
            requires_confirmation: requiresConfirmation,
            matched_speaker: matchedSpeaker?.label,
          },
        });

      return new Response(
        JSON.stringify({
          identified: true,
          stylist_id: bestMatch.staff_id,
          stylist_name: bestMatch.name,
          confidence: bestMatch.similarity,
          confidence_level: bestMatch.confidence_level,
          requires_confirmation: requiresConfirmation,
          matched_speaker: matchedSpeaker?.label,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // No match found
    return new Response(
      JSON.stringify({
        identified: false,
        stylist_id: null,
        stylist_name: null,
        confidence: 0,
        confidence_level: 'none',
        requires_confirmation: true,
        message: 'No matching staff found. Manual selection required.',
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
