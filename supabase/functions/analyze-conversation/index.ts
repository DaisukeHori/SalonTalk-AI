/**
 * Analyze Conversation Edge Function
 * POST /analyze-conversation
 *
 * Analyzes conversation segments using Claude AI
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { createSupabaseClient, getUser } from '../_shared/supabase.ts';
import { jsonResponse, errorResponse, unauthorizedResponse } from '../_shared/response.ts';

interface Segment {
  speaker: 'stylist' | 'customer';
  text: string;
  startTimeMs: number;
  endTimeMs: number;
}

interface AnalyzeRequest {
  sessionId: string;
  chunkIndex: number;
  segments: Segment[];
}

const ANALYSIS_SYSTEM_PROMPT = `あなたは美容室の接客会話を分析する専門家です。
以下の会話トランスクリプトを分析し、7つの指標でスコアリングしてください。

## 分析指標
1. トーク比率（美容師:お客様 = 40:60が理想）
2. 質問の質（オープン質問の割合、60%以上が理想）
3. 感情分析（ポジティブ表現の割合、70%以上が理想）
4. 悩みキーワード（乾燥、パサつき、広がる等を検出、2個以上で高評価）
5. 提案タイミング（悩み検出から提案までの時間、3分以内が理想）
6. 提案の質（悩みに対応した商品提案かどうか）
7. 成約有無（店販購入の有無）

## 出力形式
以下のJSON形式で出力してください。説明文は不要です。
{
  "overallScore": number,
  "metrics": {
    "talkRatio": { "score": number, "stylistRatio": number, "customerRatio": number, "details": string },
    "questionQuality": { "score": number, "openCount": number, "closedCount": number, "details": string },
    "emotion": { "score": number, "positiveRatio": number, "details": string },
    "concernKeywords": { "score": number, "keywords": string[], "details": string },
    "proposalTiming": { "score": number, "timingMs": number | null, "details": string },
    "proposalQuality": { "score": number, "matchRate": number, "details": string },
    "conversion": { "score": number, "isConverted": boolean, "details": string }
  },
  "suggestions": string[],
  "highlights": string[]
}`;

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = createSupabaseClient(req);

    // Verify authentication
    await getUser(supabase);

    // Parse request body
    const body: AnalyzeRequest = await req.json();

    if (!body.sessionId || body.chunkIndex === undefined || !body.segments) {
      return errorResponse('VAL_001', 'Missing required parameters', 400);
    }

    // Format conversation for Claude
    const conversation = body.segments
      .map((s) => `[${s.speaker === 'stylist' ? '美容師' : 'お客様'}] ${s.text}`)
      .join('\n');

    // Call Claude API
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      return errorResponse('AI_001', 'Anthropic API key not configured', 500);
    }

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2000,
        system: ANALYSIS_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `以下の会話を分析してください:\n\n${conversation}`,
          },
        ],
      }),
    });

    if (!claudeResponse.ok) {
      const error = await claudeResponse.text();
      console.error('Claude API error:', error);
      return errorResponse('AI_001', 'Failed to analyze conversation', 500);
    }

    const claudeResult = await claudeResponse.json();
    const analysisText = claudeResult.content[0].text;

    // Parse JSON from Claude response
    let analysis;
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse Claude response:', parseError);
      return errorResponse('AI_003', 'Failed to parse analysis result', 500);
    }

    // Save analysis result to database
    const { error: insertError } = await supabase.from('analysis_results').insert({
      session_id: body.sessionId,
      chunk_index: body.chunkIndex,
      overall_score: analysis.overallScore,
      metrics: analysis.metrics,
      suggestions: analysis.suggestions,
      highlights: analysis.highlights,
    });

    if (insertError) {
      console.error('Failed to save analysis:', insertError);
      // Don't fail the request, still return the analysis
    }

    // Broadcast score update via realtime
    await supabase.channel(`session:${body.sessionId}`).send({
      type: 'broadcast',
      event: 'score_update',
      payload: {
        sessionId: body.sessionId,
        chunkIndex: body.chunkIndex,
        overallScore: analysis.overallScore,
        metrics: {
          talkRatio: analysis.metrics.talkRatio.score,
          questionQuality: analysis.metrics.questionQuality.score,
          emotion: analysis.metrics.emotion.score,
        },
        timestamp: new Date().toISOString(),
      },
    });

    return jsonResponse(analysis);
  } catch (error) {
    console.error('Error in analyze-conversation:', error);

    if (error.message === 'Unauthorized') {
      return unauthorizedResponse();
    }

    return errorResponse('INTERNAL_ERROR', error.message, 500);
  }
});
