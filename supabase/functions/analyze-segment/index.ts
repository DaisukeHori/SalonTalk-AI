/**
 * Analyze Segment Edge Function
 * POST /analyze-segment
 *
 * Fetches transcripts and speaker segments from database,
 * merges them, and performs 7-indicator analysis using Claude AI.
 * Triggers success case search when concern keywords are detected.
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { createSupabaseClient, createSupabaseAdminClient, getUser } from '../_shared/supabase.ts';
import { jsonResponse, errorResponse, unauthorizedResponse } from '../_shared/response.ts';

interface AnalyzeSegmentRequest {
  sessionId: string;
  chunkIndex: number;
}

interface TranscriptSegment {
  id: string;
  session_id: string;
  chunk_index: number;
  text: string;
  start_time_ms: number;
  end_time_ms: number;
  confidence: number;
  created_at: string;
}

interface SpeakerSegment {
  id: string;
  session_id: string;
  chunk_index: number;
  speaker_label: string;
  start_time_ms: number;
  end_time_ms: number;
  confidence: number;
}

interface MergedSegment {
  speaker: 'stylist' | 'customer' | 'unknown';
  text: string;
  startTimeMs: number;
  endTimeMs: number;
  confidence: number;
}

interface AnalysisMetrics {
  talkRatio: {
    score: number;
    stylistRatio: number;
    customerRatio: number;
    details: string;
  };
  questionQuality: {
    score: number;
    openCount: number;
    closedCount: number;
    details: string;
  };
  emotion: {
    score: number;
    positiveRatio: number;
    details: string;
  };
  concernKeywords: {
    score: number;
    keywords: string[];
    details: string;
  };
  proposalTiming: {
    score: number;
    timingMs: number | null;
    details: string;
  };
  proposalQuality: {
    score: number;
    matchRate: number;
    details: string;
  };
  conversion: {
    score: number;
    isConverted: boolean;
    details: string;
  };
}

interface AnalysisResult {
  overallScore: number;
  metrics: AnalysisMetrics;
  suggestions: string[];
  highlights: string[];
}

// Metric weights for calculating overall score
const METRIC_WEIGHTS = {
  talkRatio: 0.15,
  questionQuality: 0.15,
  emotion: 0.15,
  concernKeywords: 0.10,
  proposalTiming: 0.15,
  proposalQuality: 0.15,
  conversion: 0.15,
};

const ANALYSIS_SYSTEM_PROMPT = `あなたは美容室の接客会話を分析する専門家です。
以下の会話トランスクリプトを分析し、7つの指標でスコアリングしてください。

## 分析指標と重み
1. トーク比率 (15%): 美容師:お客様 = 40:60が理想
2. 質問の質 (15%): オープン質問の割合、60%以上が理想
3. 感情分析 (15%): ポジティブ表現の割合、70%以上が理想
4. 悩みキーワード (10%): 乾燥、パサつき、広がる等を検出、2個以上で高評価
5. 提案タイミング (15%): 悩み検出から提案までの時間、3分以内が理想
6. 提案の質 (15%): 悩みに対応した商品提案かどうか
7. 成約有無 (15%): 店販購入の有無

## 悩みキーワード一覧
- 乾燥、パサつき、広がり、うねり、くせ毛
- 白髪、薄毛、抜け毛、ボリューム不足
- ダメージ、切れ毛、枝毛
- ツヤ不足、まとまらない、硬い、柔らかすぎ
- 頭皮のかゆみ、フケ、べたつき

## 出力形式
以下のJSON形式で出力してください。説明文は不要です。
{
  "overallScore": number (0-100),
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

/**
 * Merge transcript segments with speaker diarization results
 */
function mergeSegments(
  transcripts: TranscriptSegment[],
  speakers: SpeakerSegment[]
): MergedSegment[] {
  const merged: MergedSegment[] = [];

  for (const transcript of transcripts) {
    // Find overlapping speaker segment
    const speaker = speakers.find(
      (s) =>
        s.start_time_ms <= transcript.start_time_ms &&
        s.end_time_ms >= transcript.end_time_ms
    );

    // Map speaker label to role
    let role: 'stylist' | 'customer' | 'unknown' = 'unknown';
    if (speaker) {
      // Assume SPEAKER_00 is stylist (usually starts first), SPEAKER_01 is customer
      role = speaker.speaker_label === 'SPEAKER_00' ? 'stylist' : 'customer';
    }

    merged.push({
      speaker: role,
      text: transcript.text,
      startTimeMs: transcript.start_time_ms,
      endTimeMs: transcript.end_time_ms,
      confidence: transcript.confidence,
    });
  }

  // Sort by start time
  merged.sort((a, b) => a.startTimeMs - b.startTimeMs);

  return merged;
}

/**
 * Calculate weighted overall score from metrics
 */
function calculateWeightedScore(metrics: AnalysisMetrics): number {
  let totalScore = 0;
  totalScore += metrics.talkRatio.score * METRIC_WEIGHTS.talkRatio;
  totalScore += metrics.questionQuality.score * METRIC_WEIGHTS.questionQuality;
  totalScore += metrics.emotion.score * METRIC_WEIGHTS.emotion;
  totalScore += metrics.concernKeywords.score * METRIC_WEIGHTS.concernKeywords;
  totalScore += metrics.proposalTiming.score * METRIC_WEIGHTS.proposalTiming;
  totalScore += metrics.proposalQuality.score * METRIC_WEIGHTS.proposalQuality;
  totalScore += metrics.conversion.score * METRIC_WEIGHTS.conversion;
  return Math.round(totalScore);
}

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = createSupabaseClient(req);
    const adminClient = createSupabaseAdminClient();

    // Verify authentication
    await getUser(supabase);

    // Parse request body
    const body: AnalyzeSegmentRequest = await req.json();

    if (!body.sessionId || body.chunkIndex === undefined) {
      return errorResponse('VAL_001', 'sessionId and chunkIndex are required', 400);
    }

    // Fetch session info
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', body.sessionId)
      .single();

    if (sessionError || !session) {
      return errorResponse('NOT_FOUND', 'Session not found', 404);
    }

    // Fetch transcripts for this chunk
    const { data: transcripts, error: transcriptError } = await supabase
      .from('transcripts')
      .select('*')
      .eq('session_id', body.sessionId)
      .eq('chunk_index', body.chunkIndex)
      .order('start_time_ms', { ascending: true });

    if (transcriptError) {
      console.error('Failed to fetch transcripts:', transcriptError);
      return errorResponse('DB_001', 'Failed to fetch transcripts', 500);
    }

    if (!transcripts || transcripts.length === 0) {
      return jsonResponse({
        message: 'No transcripts found for this chunk',
        sessionId: body.sessionId,
        chunkIndex: body.chunkIndex,
      });
    }

    // Fetch speaker segments for this chunk
    const { data: speakers, error: speakerError } = await supabase
      .from('speaker_segments')
      .select('*')
      .eq('session_id', body.sessionId)
      .eq('chunk_index', body.chunkIndex)
      .order('start_time_ms', { ascending: true });

    if (speakerError) {
      console.error('Failed to fetch speaker segments:', speakerError);
    }

    // Merge transcripts with speaker info
    const mergedSegments = mergeSegments(
      transcripts as TranscriptSegment[],
      (speakers || []) as SpeakerSegment[]
    );

    // Format conversation for Claude
    const conversation = mergedSegments
      .map((s) => {
        const label = s.speaker === 'stylist' ? '美容師' : s.speaker === 'customer' ? 'お客様' : '不明';
        return `[${label}] ${s.text}`;
      })
      .join('\n');

    // Call Claude API for analysis
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
    let analysis: AnalysisResult;
    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
        // Recalculate weighted score for consistency
        analysis.overallScore = calculateWeightedScore(analysis.metrics);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse Claude response:', parseError);
      return errorResponse('AI_003', 'Failed to parse analysis result', 500);
    }

    // Save analysis result to database
    const { data: analysisRecord, error: insertError } = await supabase
      .from('session_analyses')
      .insert({
        session_id: body.sessionId,
        chunk_index: body.chunkIndex,
        overall_score: analysis.overallScore,
        talk_ratio_score: analysis.metrics.talkRatio.score,
        talk_ratio_detail: analysis.metrics.talkRatio,
        question_score: analysis.metrics.questionQuality.score,
        question_detail: analysis.metrics.questionQuality,
        emotion_score: analysis.metrics.emotion.score,
        emotion_detail: analysis.metrics.emotion,
        concern_keywords_score: analysis.metrics.concernKeywords.score,
        concern_keywords_detail: analysis.metrics.concernKeywords,
        proposal_timing_score: analysis.metrics.proposalTiming.score,
        proposal_timing_detail: analysis.metrics.proposalTiming,
        proposal_quality_score: analysis.metrics.proposalQuality.score,
        proposal_quality_detail: analysis.metrics.proposalQuality,
        conversion_score: analysis.metrics.conversion.score,
        conversion_detail: analysis.metrics.conversion,
        suggestions: analysis.suggestions,
        highlights: analysis.highlights,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to save analysis:', insertError);
    }

    // Broadcast score update via realtime
    const channel = supabase.channel(`session:${body.sessionId}`);
    await channel.send({
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
          concernKeywords: analysis.metrics.concernKeywords.score,
          proposalTiming: analysis.metrics.proposalTiming.score,
          proposalQuality: analysis.metrics.proposalQuality.score,
          conversion: analysis.metrics.conversion.score,
        },
        timestamp: new Date().toISOString(),
      },
    });

    // Trigger success case search if concern keywords detected
    if (analysis.metrics.concernKeywords.keywords.length > 0) {
      try {
        const searchResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/search-success-cases`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({
              sessionId: body.sessionId,
              keywords: analysis.metrics.concernKeywords.keywords,
              limit: 3,
            }),
          }
        );

        if (searchResponse.ok) {
          const searchResult = await searchResponse.json();
          // Broadcast similar cases
          if (searchResult.data?.cases?.length > 0) {
            await channel.send({
              type: 'broadcast',
              event: 'similar_cases',
              payload: {
                sessionId: body.sessionId,
                keywords: analysis.metrics.concernKeywords.keywords,
                cases: searchResult.data.cases,
                timestamp: new Date().toISOString(),
              },
            });
          }
        }
      } catch (searchError) {
        console.error('Failed to search success cases:', searchError);
      }
    }

    return jsonResponse({
      ...analysis,
      sessionId: body.sessionId,
      chunkIndex: body.chunkIndex,
      segmentCount: mergedSegments.length,
    });
  } catch (error) {
    console.error('Error in analyze-segment:', error);

    if (error.message === 'Unauthorized') {
      return unauthorizedResponse();
    }

    return errorResponse('INTERNAL_ERROR', error.message, 500);
  }
});
