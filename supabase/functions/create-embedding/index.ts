/**
 * Create Embedding Edge Function
 * POST /create-embedding
 *
 * Creates vector embeddings for success cases using OpenAI text-embedding-3-small
 * Stores embeddings in pgvector for similarity search
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { createSupabaseClient, createSupabaseAdminClient, getUser, getStaff } from '../_shared/supabase.ts';
import { jsonResponse, errorResponse, unauthorizedResponse } from '../_shared/response.ts';

interface CreateEmbeddingRequest {
  sessionId: string;
  reportId?: string;
  text?: string;
  metadata?: Record<string, unknown>;
}

interface OpenAIEmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

/**
 * Build text content for embedding from session data
 */
function buildEmbeddingText(
  session: Record<string, unknown>,
  report: Record<string, unknown> | null,
  transcripts: Array<{ text: string; speaker_label?: string }>
): string {
  const parts: string[] = [];

  // Add report summary if available
  if (report) {
    if (report.summary) {
      parts.push(`サマリー: ${report.summary}`);
    }
    if (report.strengths && Array.isArray(report.strengths)) {
      parts.push(`良かった点: ${(report.strengths as string[]).join('、')}`);
    }
    if (report.improvements && Array.isArray(report.improvements)) {
      parts.push(`改善点: ${(report.improvements as string[]).join('、')}`);
    }
  }

  // Add conversation highlights
  const conversationText = transcripts
    .map((t) => {
      const speaker = t.speaker_label === 'SPEAKER_00' ? '美容師' : 'お客様';
      return `[${speaker}] ${t.text}`;
    })
    .join('\n');

  if (conversationText) {
    parts.push(`会話:\n${conversationText}`);
  }

  return parts.join('\n\n');
}

/**
 * Call OpenAI API to create embedding
 */
async function createEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('OpenAI API error:', error);
    throw new Error('Failed to create embedding');
  }

  const result: OpenAIEmbeddingResponse = await response.json();
  return result.data[0].embedding;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = createSupabaseClient(req);
    const adminClient = createSupabaseAdminClient();

    // Verify authentication
    const user = await getUser(supabase);
    const staff = await getStaff(supabase, user.id);

    // Parse request body
    const body: CreateEmbeddingRequest = await req.json();

    if (!body.sessionId && !body.text) {
      return errorResponse('VAL_001', 'sessionId or text is required', 400);
    }

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return errorResponse('AI_001', 'OpenAI API key not configured', 500);
    }

    let embeddingText: string;
    let metadata: Record<string, unknown> = body.metadata || {};

    if (body.text) {
      // Use provided text directly
      embeddingText = body.text;
    } else {
      // Build text from session data
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', body.sessionId)
        .single();

      if (sessionError || !session) {
        return errorResponse('NOT_FOUND', 'Session not found', 404);
      }

      // Fetch report if available
      let report = null;
      if (body.reportId) {
        const { data: reportData } = await supabase
          .from('session_reports')
          .select('*')
          .eq('id', body.reportId)
          .single();
        report = reportData;
      } else {
        // Try to find report by session ID
        const { data: reportData } = await supabase
          .from('session_reports')
          .select('*')
          .eq('session_id', body.sessionId)
          .single();
        report = reportData;
      }

      // Fetch transcripts (limit to key segments)
      const { data: transcripts } = await supabase
        .from('transcripts')
        .select('text, speaker_label')
        .eq('session_id', body.sessionId)
        .order('start_time_ms', { ascending: true })
        .limit(50);

      embeddingText = buildEmbeddingText(
        session,
        report,
        transcripts || []
      );

      // Build metadata for logging
      metadata = {
        ...metadata,
        session_id: body.sessionId,
        salon_id: session.salon_id,
        stylist_id: session.stylist_id,
        overall_score: report?.overall_score,
        is_converted: report?.is_converted,
        created_at: session.created_at,
      };
    }

    // Create embedding
    const embedding = await createEmbedding(embeddingText, openaiApiKey);

    // Extract concern keywords from metadata or use default
    const concernKeywords = (metadata.concern_keywords as string[]) || ['一般'];

    // Determine result from conversion status
    const isConverted = metadata.is_converted as boolean;
    const result = isConverted ? '成約' : '未成約';

    // Store in success_cases table
    const { data: successCase, error: insertError } = await supabase
      .from('success_cases')
      .upsert(
        {
          session_id: body.sessionId,
          salon_id: staff.salon_id,
          concern_keywords: concernKeywords,
          approach_text: embeddingText,
          result: result,
          embedding: embedding,
        },
        {
          onConflict: 'session_id',
        }
      )
      .select()
      .single();

    if (insertError) {
      console.error('Failed to store embedding:', insertError);
      return errorResponse('DB_001', 'Failed to store embedding', 500);
    }

    return jsonResponse({
      id: successCase.id,
      sessionId: body.sessionId,
      embeddingDimensions: embedding.length,
      contentLength: embeddingText.length,
      message: 'Embedding created successfully',
    });
  } catch (error) {
    console.error('Error in create-embedding:', error);

    if (error.message === 'Unauthorized') {
      return unauthorizedResponse();
    }

    return errorResponse('INTERNAL_ERROR', error.message, 500);
  }
});
