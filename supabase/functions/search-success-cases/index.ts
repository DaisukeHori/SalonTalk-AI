/**
 * Search Success Cases Edge Function
 * POST /search-success-cases
 *
 * Vector search for similar success cases using pgvector
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { createSupabaseClient, getUser, getStaff } from '../_shared/supabase.ts';
import { jsonResponse, errorResponse, unauthorizedResponse } from '../_shared/response.ts';

interface SearchRequest {
  concern_keywords: string[];
  limit?: number;
  threshold?: number;
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
    const body: SearchRequest = await req.json();

    if (!body.concern_keywords || body.concern_keywords.length === 0) {
      return errorResponse('VAL_001', 'concern_keywords is required', 400);
    }

    const limit = body.limit ?? 5;
    const threshold = body.threshold ?? 0.7;

    // Generate embedding for query
    const queryText = body.concern_keywords.join(' ');

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return errorResponse('AI_001', 'OpenAI API key not configured', 500);
    }

    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: queryText,
      }),
    });

    if (!embeddingResponse.ok) {
      const error = await embeddingResponse.text();
      console.error('OpenAI embedding error:', error);
      return errorResponse('AI_001', 'Failed to generate embedding', 500);
    }

    const embeddingResult = await embeddingResponse.json();
    const queryEmbedding = embeddingResult.data[0].embedding;

    // Search for similar success cases using pgvector
    const { data: cases, error: searchError } = await supabase.rpc('search_success_cases', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit,
      salon_id: staff.salon_id,
    });

    if (searchError) {
      console.error('Vector search error:', searchError);
      return errorResponse('DB_001', 'Failed to search success cases', 500);
    }

    return jsonResponse({
      cases: cases.map((c: any) => ({
        id: c.id,
        similarity: c.similarity,
        concern_keywords: c.concern_keywords,
        approach_text: c.approach_text,
        result: c.result,
      })),
      total: cases.length,
    });
  } catch (error) {
    console.error('Error in search-success-cases:', error);

    if (error.message === 'Unauthorized') {
      return unauthorizedResponse();
    }

    return errorResponse('INTERNAL_ERROR', error.message, 500);
  }
});
