// supabase/functions/generate-report/index.ts
// Generate AI-powered session report

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createSupabaseClient, createSupabaseAdminClient, getUser } from "../_shared/supabase.ts";
import { jsonResponse, errorResponse, unauthorizedResponse } from "../_shared/response.ts";
import { corsHeaders } from "../_shared/cors.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

interface GenerateReportRequest {
  sessionId: string;
}

interface IndicatorScore {
  score: number;
  value: number;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return unauthorizedResponse("認証が必要です");
    }

    const supabase = createSupabaseClient(authHeader);
    const adminClient = createSupabaseAdminClient();

    const user = await getUser(supabase);
    if (!user) {
      return unauthorizedResponse("認証に失敗しました");
    }

    const body: GenerateReportRequest = await req.json();
    const { sessionId } = body;

    if (!sessionId) {
      return errorResponse("VAL_001", "sessionIdが必要です", 400);
    }

    // Get session with salon info
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("*, salons(*), staffs(*)")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return errorResponse("SES_001", "セッションが見つかりません", 404);
    }

    // Get all analysis results for this session
    const { data: analyses } = await adminClient
      .from("analysis_results")
      .select("*")
      .eq("session_id", sessionId)
      .order("chunk_index", { ascending: true });

    // Get all speaker segments
    const { data: segments } = await adminClient
      .from("speaker_segments")
      .select("*")
      .eq("session_id", sessionId)
      .order("start_time_ms", { ascending: true });

    if (!segments || segments.length === 0) {
      return errorResponse("SES_003", "会話データがありません", 400);
    }

    // Calculate aggregate metrics
    const aggregatedMetrics = aggregateAnalysisResults(analyses || []);

    // Generate transcript summary
    const conversationText = segments
      .map((s) => `${s.speaker === "stylist" ? "スタイリスト" : "お客様"}: ${s.text}`)
      .join("\n");

    // Generate AI report using Claude
    const aiReport = await generateAIReport(
      conversationText,
      aggregatedMetrics,
      session.customer_info
    );

    // Calculate overall score
    const overallScore = calculateOverallScore(aggregatedMetrics);

    // Create report record
    const { data: report, error: reportError } = await adminClient
      .from("reports")
      .insert({
        session_id: sessionId,
        summary: aiReport.summary,
        overall_score: overallScore,
        metrics: aggregatedMetrics,
        improvements: aiReport.improvementPoints,
        strengths: aiReport.goodPoints,
        comparison_with_average: [],
        matched_success_cases: [],
      })
      .select()
      .single();

    if (reportError) {
      console.error("Report creation error:", reportError);
      return errorResponse("DB_001", "レポートの作成に失敗しました", 500);
    }

    // Update session status to completed
    await adminClient
      .from("sessions")
      .update({ status: "completed", ended_at: new Date().toISOString() })
      .eq("id", sessionId);

    return jsonResponse({
      reportId: report.id,
      overallScore,
      goodPoints: aiReport.goodPoints,
      improvementPoints: aiReport.improvementPoints,
      actionItems: aiReport.actionItems,
      transcriptSummary: aiReport.summary,
      aiFeedback: aiReport.feedback,
    });
  } catch (error) {
    console.error("Generate report error:", error);
    return errorResponse("SYS_001", "システムエラーが発生しました", 500);
  }
});

function aggregateAnalysisResults(
  analyses: Array<{
    chunk_index: number;
    overall_score: number;
    metrics: Record<string, IndicatorScore>;
  }>
): Record<string, IndicatorScore> {
  if (analyses.length === 0) {
    return {
      talkRatio: { score: 50, value: 50 },
      questionAnalysis: { score: 50, value: 0 },
      emotionAnalysis: { score: 50, value: 50 },
      concernKeywords: { score: 50, value: 0 },
      proposalTiming: { score: 50, value: 0 },
      proposalQuality: { score: 50, value: 0 },
      conversion: { score: 50, value: 0 },
    };
  }

  // Get the latest (last) analysis as the aggregate
  const latest = analyses[analyses.length - 1];
  return latest.metrics;
}

function calculateOverallScore(metrics: Record<string, IndicatorScore>): number {
  const weights: Record<string, number> = {
    talkRatio: 0.15,
    questionAnalysis: 0.15,
    emotionAnalysis: 0.15,
    concernKeywords: 0.10,
    proposalTiming: 0.15,
    proposalQuality: 0.15,
    conversion: 0.15,
  };

  let totalScore = 0;
  let totalWeight = 0;

  for (const [key, weight] of Object.entries(weights)) {
    if (metrics[key]) {
      totalScore += metrics[key].score * weight;
      totalWeight += weight;
    }
  }

  return totalWeight > 0 ? Math.round(totalScore / totalWeight * 100) / 100 : 50;
}

interface AIReportResult {
  summary: string;
  goodPoints: string[];
  improvementPoints: string[];
  actionItems: string[];
  feedback: string;
}

async function generateAIReport(
  conversationText: string,
  metrics: Record<string, IndicatorScore>,
  customerInfo: unknown
): Promise<AIReportResult> {
  if (!ANTHROPIC_API_KEY) {
    // Fallback to rule-based report
    return generateRuleBasedReport(metrics);
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: `あなたは美容室の接客スキル向上コンサルタントです。
以下のスタイリストとお客様の会話と分析指標から、セッションレポートを生成してください。

## 会話内容
${conversationText.substring(0, 3000)}

## 分析指標
- トーク比率スコア: ${metrics.talkRatio?.score || "N/A"} (値: ${metrics.talkRatio?.value || "N/A"}%)
- 質問分析スコア: ${metrics.questionAnalysis?.score || "N/A"} (質問数: ${metrics.questionAnalysis?.value || "N/A"})
- 感情分析スコア: ${metrics.emotionAnalysis?.score || "N/A"} (ポジティブ率: ${metrics.emotionAnalysis?.value || "N/A"}%)
- 悩みキーワード検出: ${metrics.concernKeywords?.value ? "あり" : "なし"}
- 提案タイミングスコア: ${metrics.proposalTiming?.score || "N/A"}
- 提案品質スコア: ${metrics.proposalQuality?.score || "N/A"}
- 成約: ${metrics.conversion?.value ? "あり" : "なし"}

## お客様情報
${JSON.stringify(customerInfo || {})}

以下のJSON形式で回答してください:
{
  "summary": "会話の要約（100文字程度）",
  "goodPoints": ["良かった点1", "良かった点2", "良かった点3"],
  "improvementPoints": ["改善点1", "改善点2", "改善点3"],
  "actionItems": ["次回のアクション1", "次回のアクション2", "次回のアクション3"],
  "feedback": "スタイリストへの総合フィードバック（150文字程度）"
}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("Claude API error:", await response.text());
      return generateRuleBasedReport(metrics);
    }

    const result = await response.json();
    const content = result.content[0]?.text;

    if (!content) {
      return generateRuleBasedReport(metrics);
    }

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return generateRuleBasedReport(metrics);
    }

    return JSON.parse(jsonMatch[0]) as AIReportResult;
  } catch (error) {
    console.error("AI report generation error:", error);
    return generateRuleBasedReport(metrics);
  }
}

function generateRuleBasedReport(metrics: Record<string, IndicatorScore>): AIReportResult {
  const goodPoints: string[] = [];
  const improvementPoints: string[] = [];
  const actionItems: string[] = [];

  // Analyze each metric and generate feedback
  if (metrics.talkRatio?.score >= 80) {
    goodPoints.push("お客様の話をよく聞けていました");
  } else if (metrics.talkRatio?.score < 60) {
    improvementPoints.push("お客様の話をもう少し聞く時間を増やしましょう");
    actionItems.push("次回は相槌を意識して、お客様が話しやすい雰囲気を作りましょう");
  }

  if (metrics.questionAnalysis?.score >= 80) {
    goodPoints.push("効果的な質問ができていました");
  } else if (metrics.questionAnalysis?.score < 60) {
    improvementPoints.push("オープンクエスチョンを増やしましょう");
    actionItems.push("「どのような」「どんな」から始まる質問を意識しましょう");
  }

  if (metrics.emotionAnalysis?.score >= 80) {
    goodPoints.push("お客様の感情に寄り添えていました");
  } else if (metrics.emotionAnalysis?.score < 60) {
    improvementPoints.push("お客様の感情変化に注意を払いましょう");
  }

  if (metrics.concernKeywords?.value) {
    goodPoints.push("お客様の悩みを引き出すことができました");
  } else {
    improvementPoints.push("お客様の悩みをもっと深掘りしましょう");
    actionItems.push("「何かお悩みはありますか？」と直接聞いてみましょう");
  }

  if (metrics.conversion?.value) {
    goodPoints.push("商品提案が成功しました");
  }

  // Ensure we have at least some feedback
  if (goodPoints.length === 0) {
    goodPoints.push("セッションを完了できました");
  }
  if (improvementPoints.length === 0) {
    improvementPoints.push("より深い悩みのヒアリングを心がけましょう");
  }
  if (actionItems.length === 0) {
    actionItems.push("次回も積極的にコミュニケーションを取りましょう");
  }

  return {
    summary: "施術中の会話分析が完了しました。",
    goodPoints: goodPoints.slice(0, 3),
    improvementPoints: improvementPoints.slice(0, 3),
    actionItems: actionItems.slice(0, 3),
    feedback: `全体的なスコアは${calculateOverallScore(metrics)}点でした。${
      goodPoints[0] || ""
    }。${improvementPoints[0] ? `改善点として、${improvementPoints[0]}` : ""}`,
  };
}
