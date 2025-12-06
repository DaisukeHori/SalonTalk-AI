/**
 * Extract Customer Name Edge Function
 * POST /extract-customer-name
 *
 * Uses Claude AI to extract customer name from conversation transcript.
 * Updates customer record with extracted name if found.
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { createSupabaseClient, getUser, getStaff } from '../_shared/supabase.ts';
import {
  jsonResponse,
  errorResponse,
  unauthorizedResponse,
} from '../_shared/response.ts';
import { callClaudeJson, formatConversation } from '../_shared/anthropic.ts';

interface ExtractNameRequest {
  session_id: string;
  customer_id: string;
  segments?: Array<{
    speaker: string;
    text: string;
  }>;
}

interface ClaudeNameResponse {
  name: string | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  context: string | null;
}

const NAME_EXTRACTION_SYSTEM_PROMPT = `あなたは美容室の会話から顧客の名前を抽出するアシスタントです。
会話の中から、顧客の名前を見つけてください。

以下のパターンを探してください：
- 美容師が「〜さん」「〜様」と呼びかけている場合
- 顧客が自己紹介している場合
- 予約名や確認の際に名前が言及されている場合

結果はJSON形式で返してください：
{
  "name": "抽出した名前（見つからない場合はnull）",
  "confidence": "high（明確な呼びかけ）、medium（文脈から推測）、low（不確実）、none（見つからない）",
  "context": "名前が見つかった会話の部分（見つからない場合はnull）"
}

注意：
- 名前は敬称（さん、様）を除いた形で返してください
- 不確実な場合は無理に名前を返さないでください
- 名前が複数回言及されている場合は、最も確実なものを選んでください`;

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
    const body: ExtractNameRequest = await req.json();

    // Validate required fields
    if (!body.session_id) {
      return errorResponse('VAL_001', 'session_id is required', 400);
    }

    if (!body.customer_id) {
      return errorResponse('VAL_002', 'customer_id is required', 400);
    }

    // Get segments from request or fetch from database
    let segments = body.segments;

    if (!segments || segments.length === 0) {
      // Fetch segments from database
      const { data: dbSegments, error: segmentsError } = await supabase
        .from('speaker_segments')
        .select('speaker, text')
        .eq('session_id', body.session_id)
        .order('start_time_ms', { ascending: true });

      if (segmentsError) {
        console.error('Failed to fetch segments:', segmentsError);
        return errorResponse('DB_001', 'Failed to fetch conversation segments', 500);
      }

      if (!dbSegments || dbSegments.length === 0) {
        return jsonResponse({
          name: null,
          confidence: 'none',
          context: null,
          message: 'No conversation segments found',
        });
      }

      segments = dbSegments;
    }

    // Format conversation for Claude
    const conversationText = formatConversation(segments);

    // Call Claude to extract name
    let extractedName: ClaudeNameResponse;
    try {
      extractedName = await callClaudeJson<ClaudeNameResponse>(
        [
          {
            role: 'user',
            content: `以下の美容室での会話から顧客の名前を抽出してください：\n\n${conversationText}`,
          },
        ],
        {
          system: NAME_EXTRACTION_SYSTEM_PROMPT,
          maxTokens: 500,
          temperature: 0.1,
        }
      );
    } catch (error) {
      console.error('Claude API error:', error);
      return errorResponse('AI_001', 'Failed to extract name with AI', 500);
    }

    // Update customer record if name found with sufficient confidence
    let nameUpdated = false;
    if (
      extractedName.name &&
      (extractedName.confidence === 'high' || extractedName.confidence === 'medium')
    ) {
      const { error: updateError } = await supabase
        .from('customers')
        .update({
          name: extractedName.name,
          updated_at: new Date().toISOString(),
        })
        .eq('id', body.customer_id)
        .eq('salon_id', staff.salon_id);

      if (updateError) {
        console.error('Customer name update error:', updateError);
        // Non-fatal, continue
      } else {
        nameUpdated = true;
      }
    }

    return jsonResponse({
      name: extractedName.name,
      confidence: extractedName.confidence,
      context: extractedName.context,
      name_updated: nameUpdated,
    });
  } catch (error) {
    console.error('Error in extract-customer-name:', error);

    if (error.message === 'Unauthorized') {
      return unauthorizedResponse();
    }

    return errorResponse('INTERNAL_ERROR', error.message, 500);
  }
});
