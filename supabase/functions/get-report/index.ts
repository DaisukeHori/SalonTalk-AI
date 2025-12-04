/**
 * Get Report Edge Function
 * Retrieve session report data by session ID
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token from header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: { code: 'AUTH_001', message: '認証が必要です' } }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user token
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get session ID from query params
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('sessionId');

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: { code: 'VAL_001', message: 'セッションIDが必要です' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get session with report data
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select(`
        id,
        started_at,
        ended_at,
        status,
        customer_info,
        staffs!sessions_stylist_id_fkey (
          id,
          name
        )
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: { code: 'SES_001', message: 'セッションが見つかりません' } }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get session report
    const { data: report, error: reportError } = await supabase
      .from('session_reports')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (reportError && reportError.code !== 'PGRST116') {
      console.error('Report fetch error:', reportError);
      return new Response(
        JSON.stringify({ error: { code: 'DB_001', message: 'レポートの取得に失敗しました' } }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get session analyses
    const { data: analyses, error: analysesError } = await supabase
      .from('session_analyses')
      .select('*')
      .eq('session_id', sessionId)
      .order('chunk_index', { ascending: true });

    if (analysesError) {
      console.error('Analyses fetch error:', analysesError);
    }

    // Build metrics from analyses
    const metrics = buildMetricsFromAnalyses(analyses || [], report?.indicator_scores);

    // Calculate duration
    const duration = session.ended_at
      ? Math.round((new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 1000 / 60)
      : null;

    // Build response
    const responseData = {
      id: report?.id || null,
      sessionId: session.id,
      stylist: session.staffs,
      startedAt: session.started_at,
      endedAt: session.ended_at,
      duration,
      status: session.status,
      customerInfo: session.customer_info,
      summary: report?.transcript_summary || null,
      overallScore: report?.overall_score || calculateOverallFromAnalyses(analyses || []),
      metrics,
      improvements: report?.improvement_points || [],
      strengths: report?.good_points || [],
      actionItems: report?.action_items || [],
      aiFeedback: report?.ai_feedback || null,
      generatedAt: report?.created_at || null,
    };

    return new Response(
      JSON.stringify({ data: responseData }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: { code: 'SYS_001', message: 'システムエラーが発生しました' } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Build metrics object from analyses data
 */
function buildMetricsFromAnalyses(
  analyses: Array<{
    indicator_type: string;
    score: number;
    value: number;
    details: any;
  }>,
  indicatorScores?: Record<string, any>
): Record<string, any> {
  const metrics: Record<string, any> = {
    talkRatio: { score: 0, details: '', stylistRatio: 50, customerRatio: 50 },
    questionQuality: { score: 0, details: '', openCount: 0, closedCount: 0 },
    emotion: { score: 0, details: '', positiveRatio: 0 },
    concernKeywords: { score: 0, details: '', keywords: [] },
    proposalTiming: { score: 0, details: '' },
    proposalQuality: { score: 0, details: '', matchRate: 0 },
    conversion: { score: 0, details: '', isConverted: false },
  };

  // Use stored indicator scores if available
  if (indicatorScores) {
    return { ...metrics, ...indicatorScores };
  }

  // Group analyses by indicator type and get latest values
  const latestByType: Record<string, any> = {};
  for (const analysis of analyses) {
    const existing = latestByType[analysis.indicator_type];
    if (!existing || existing.chunk_index < analysis.chunk_index) {
      latestByType[analysis.indicator_type] = analysis;
    }
  }

  // Map to metrics
  if (latestByType['talk_ratio']) {
    const tr = latestByType['talk_ratio'];
    metrics.talkRatio = {
      score: tr.score,
      details: tr.details?.description || `スタイリストの発話比率: ${Math.round(tr.value)}%`,
      stylistRatio: Math.round(tr.value),
      customerRatio: Math.round(100 - tr.value),
    };
  }

  if (latestByType['question_analysis']) {
    const qa = latestByType['question_analysis'];
    metrics.questionQuality = {
      score: qa.score,
      details: qa.details?.description || `質問数: ${Math.round(qa.value)}`,
      openCount: qa.details?.openQuestions || 0,
      closedCount: qa.details?.closedQuestions || 0,
    };
  }

  if (latestByType['emotion_analysis']) {
    const ea = latestByType['emotion_analysis'];
    metrics.emotion = {
      score: ea.score,
      details: ea.details?.description || `ポジティブ比率: ${Math.round(ea.value)}%`,
      positiveRatio: Math.round(ea.value),
    };
  }

  if (latestByType['concern_keywords']) {
    const ck = latestByType['concern_keywords'];
    metrics.concernKeywords = {
      score: ck.score,
      details: ck.details?.description || '悩みキーワードの検出状況',
      keywords: ck.details?.detectedKeywords || [],
    };
  }

  if (latestByType['proposal_timing']) {
    const pt = latestByType['proposal_timing'];
    metrics.proposalTiming = {
      score: pt.score,
      details: pt.details?.description || '提案タイミングの評価',
    };
  }

  if (latestByType['proposal_quality']) {
    const pq = latestByType['proposal_quality'];
    metrics.proposalQuality = {
      score: pq.score,
      details: pq.details?.description || '提案品質の評価',
      matchRate: pq.details?.matchRate || Math.round(pq.value),
    };
  }

  if (latestByType['conversion']) {
    const cv = latestByType['conversion'];
    metrics.conversion = {
      score: cv.score,
      details: cv.details?.description || '成約状況',
      isConverted: cv.value > 50,
    };
  }

  return metrics;
}

/**
 * Calculate overall score from analyses
 */
function calculateOverallFromAnalyses(
  analyses: Array<{ indicator_type: string; score: number }>
): number {
  if (analyses.length === 0) return 0;

  const weights: Record<string, number> = {
    talk_ratio: 0.15,
    question_analysis: 0.15,
    emotion_analysis: 0.15,
    concern_keywords: 0.10,
    proposal_timing: 0.15,
    proposal_quality: 0.15,
    conversion: 0.15,
  };

  // Get latest score for each indicator type
  const latestScores: Record<string, number> = {};
  for (const analysis of analyses) {
    latestScores[analysis.indicator_type] = analysis.score;
  }

  let totalScore = 0;
  let totalWeight = 0;

  for (const [type, weight] of Object.entries(weights)) {
    if (latestScores[type] !== undefined) {
      totalScore += latestScores[type] * weight;
      totalWeight += weight;
    }
  }

  if (totalWeight === 0) return 0;

  return Math.round(totalScore / totalWeight);
}
