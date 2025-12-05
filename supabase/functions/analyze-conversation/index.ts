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

// FR-304: Alert type definitions
type AlertType =
  | 'risk_warning'
  | 'talk_ratio_alert'
  | 'low_engagement_alert'
  | 'emotion_negative_alert'
  | 'question_shortage_alert'
  | 'long_silence_alert'
  | 'proposal_missed_alert'
  | 'concern_detected'
  | 'proposal_chance';

interface Alert {
  type: AlertType;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  sessionId: string;
  chunkIndex: number;
  timestamp: string;
  data?: Record<string, unknown>;
}

// FR-304: Generate alerts based on analysis results
function generateAlerts(
  analysis: Record<string, unknown>,
  sessionId: string,
  chunkIndex: number
): Alert[] {
  const alerts: Alert[] = [];
  const timestamp = new Date().toISOString();
  const metrics = analysis.metrics as Record<string, Record<string, unknown>>;

  // Risk warning - overall score below 50
  if (typeof analysis.overallScore === 'number' && analysis.overallScore < 50) {
    alerts.push({
      type: 'risk_warning',
      title: '⚠️ リスク警告',
      message: `接客スコアが${analysis.overallScore}点と低下しています。会話のバランスを見直してください。`,
      severity: 'critical',
      sessionId,
      chunkIndex,
      timestamp,
      data: { score: analysis.overallScore },
    });
  }

  // Talk ratio alert - stylist talking more than 60%
  if (metrics.talkRatio && typeof metrics.talkRatio.stylistRatio === 'number') {
    if (metrics.talkRatio.stylistRatio > 60) {
      alerts.push({
        type: 'talk_ratio_alert',
        title: '📊 トーク比率アラート',
        message: `美容師の発話比率が${metrics.talkRatio.stylistRatio}%です。お客様の話をもっと聞いてみましょう。`,
        severity: 'warning',
        sessionId,
        chunkIndex,
        timestamp,
        data: { stylistRatio: metrics.talkRatio.stylistRatio },
      });
    }
  }

  // Emotion negative alert
  if (metrics.emotion && typeof metrics.emotion.positiveRatio === 'number') {
    if (metrics.emotion.positiveRatio < 40) {
      alerts.push({
        type: 'emotion_negative_alert',
        title: '😟 お客様の反応に注意',
        message: 'ネガティブな反応が多く検出されています。お客様の気持ちに寄り添いましょう。',
        severity: 'warning',
        sessionId,
        chunkIndex,
        timestamp,
        data: { positiveRatio: metrics.emotion.positiveRatio },
      });
    }
  }

  // Question shortage alert
  if (metrics.questionQuality) {
    const totalQuestions =
      (typeof metrics.questionQuality.openCount === 'number' ? metrics.questionQuality.openCount : 0) +
      (typeof metrics.questionQuality.closedCount === 'number' ? metrics.questionQuality.closedCount : 0);
    if (totalQuestions < 3 && chunkIndex > 0) {
      alerts.push({
        type: 'question_shortage_alert',
        title: '❓ 質問を増やしましょう',
        message: '質問が少なくなっています。オープンクエスチョンでお客様の悩みを引き出しましょう。',
        severity: 'info',
        sessionId,
        chunkIndex,
        timestamp,
        data: { questionCount: totalQuestions },
      });
    }
  }

  // Concern detected - opportunity to propose
  if (metrics.concernKeywords) {
    const keywords = metrics.concernKeywords.keywords as string[] | undefined;
    if (keywords && keywords.length > 0) {
      alerts.push({
        type: 'concern_detected',
        title: '💡 悩みキーワード検出',
        message: `お客様が「${keywords.join('」「')}」について悩んでいます。`,
        severity: 'info',
        sessionId,
        chunkIndex,
        timestamp,
        data: { keywords },
      });

      // Also add proposal chance if keywords detected
      alerts.push({
        type: 'proposal_chance',
        title: '🎯 提案チャンス！',
        message: '今が商品を提案する絶好のタイミングです。',
        severity: 'info',
        sessionId,
        chunkIndex,
        timestamp,
        data: { concernKeywords: keywords },
      });
    }
  }

  // Proposal missed alert - concern detected but no proposal
  if (
    metrics.concernKeywords &&
    metrics.proposalTiming &&
    (metrics.concernKeywords.keywords as string[] | undefined)?.length
  ) {
    const timingMs = metrics.proposalTiming.timingMs as number | null;
    if (timingMs === null || timingMs > 180000) {
      // More than 3 minutes
      alerts.push({
        type: 'proposal_missed_alert',
        title: '💭 提案機会を逃しています',
        message: '悩みを検出してから3分以上経過しました。早めに提案しましょう。',
        severity: 'warning',
        sessionId,
        chunkIndex,
        timestamp,
        data: { timingMs },
      });
    }
  }

  return alerts;
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

    // Save analysis results to database - one row per indicator type (normalized schema)
    const analysisRows = [
      {
        session_id: body.sessionId,
        chunk_index: body.chunkIndex,
        indicator_type: 'talk_ratio',
        value: analysis.metrics.talkRatio?.stylistRatio || 0,
        score: analysis.metrics.talkRatio?.score || 0,
        details: analysis.metrics.talkRatio,
      },
      {
        session_id: body.sessionId,
        chunk_index: body.chunkIndex,
        indicator_type: 'question_analysis',
        value: analysis.metrics.questionQuality?.openCount || 0,
        score: analysis.metrics.questionQuality?.score || 0,
        details: analysis.metrics.questionQuality,
      },
      {
        session_id: body.sessionId,
        chunk_index: body.chunkIndex,
        indicator_type: 'emotion_analysis',
        value: analysis.metrics.emotion?.positiveRatio || 0,
        score: analysis.metrics.emotion?.score || 0,
        details: analysis.metrics.emotion,
      },
      {
        session_id: body.sessionId,
        chunk_index: body.chunkIndex,
        indicator_type: 'concern_keywords',
        value: (analysis.metrics.concernKeywords?.keywords?.length || 0),
        score: analysis.metrics.concernKeywords?.score || 0,
        details: analysis.metrics.concernKeywords,
      },
      {
        session_id: body.sessionId,
        chunk_index: body.chunkIndex,
        indicator_type: 'proposal_timing',
        value: analysis.metrics.proposalTiming?.timingMs || 0,
        score: analysis.metrics.proposalTiming?.score || 0,
        details: analysis.metrics.proposalTiming,
      },
      {
        session_id: body.sessionId,
        chunk_index: body.chunkIndex,
        indicator_type: 'proposal_quality',
        value: analysis.metrics.proposalQuality?.matchRate || 0,
        score: analysis.metrics.proposalQuality?.score || 0,
        details: analysis.metrics.proposalQuality,
      },
      {
        session_id: body.sessionId,
        chunk_index: body.chunkIndex,
        indicator_type: 'conversion',
        value: analysis.metrics.conversion?.isConverted ? 100 : 0,
        score: analysis.metrics.conversion?.score || 0,
        details: analysis.metrics.conversion,
      },
    ];

    // Upsert each indicator (in case of reprocessing)
    for (const row of analysisRows) {
      const { error: insertError } = await supabase
        .from('session_analyses')
        .upsert(row, { onConflict: 'session_id,chunk_index,indicator_type' });

      if (insertError) {
        console.error(`Failed to save ${row.indicator_type} analysis:`, insertError);
      }
    }

    // Also save to analysis_results for backwards compatibility
    const { error: resultsError } = await supabase
      .from('analysis_results')
      .upsert({
        session_id: body.sessionId,
        chunk_index: body.chunkIndex,
        overall_score: analysis.overallScore,
        metrics: analysis.metrics,
        suggestions: analysis.suggestions,
        highlights: analysis.highlights,
      }, { onConflict: 'session_id,chunk_index' });

    if (resultsError) {
      console.error('Failed to save analysis_results:', resultsError);
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

    // FR-304: Generate detailed alerts based on analysis
    const alerts = generateAlerts(analysis, body.sessionId, body.chunkIndex);
    for (const alert of alerts) {
      await supabase.channel(`session:${body.sessionId}`).send({
        type: 'broadcast',
        event: 'alert',
        payload: alert,
      });
    }

    return jsonResponse({ ...analysis, alerts });
  } catch (error) {
    console.error('Error in analyze-conversation:', error);

    if (error.message === 'Unauthorized') {
      return unauthorizedResponse();
    }

    return errorResponse('INTERNAL_ERROR', error.message, 500);
  }
});
