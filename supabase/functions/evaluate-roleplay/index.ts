/**
 * Evaluate Roleplay Edge Function
 * POST /evaluate-roleplay
 *
 * Evaluates completed roleplay training sessions using Claude AI
 * Provides detailed feedback, scoring, and improvement suggestions
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { createSupabaseClient, getUser, getStaff } from '../_shared/supabase.ts';
import { jsonResponse, errorResponse, unauthorizedResponse } from '../_shared/response.ts';

interface RoleplayMessage {
  role: 'customer' | 'stylist';
  content: string;
  timestamp: string;
}

interface EvaluateRoleplayRequest {
  session_id?: string;
  scenario_id?: string;
  messages: RoleplayMessage[];
  objectives?: string[];
}

interface EvaluationMetric {
  score: number;
  details: string;
}

interface EvaluationResult {
  overallScore: number;
  metrics: {
    empathy: EvaluationMetric;
    productKnowledge: EvaluationMetric;
    questioningSkill: EvaluationMetric;
    objectionHandling: EvaluationMetric;
    closingSkill: EvaluationMetric;
  };
  feedback: string;
  improvements: string[];
  strengths: string[];
  modelAnswers: Array<{
    situation: string;
    stylistResponse: string;
    modelAnswer: string;
    reasoning: string;
  }>;
}

const DEFAULT_OBJECTIVES = [
  'お客様の悩みを引き出す',
  '適切なタイミングで商品を提案する',
  '押し売りではなく、お客様に寄り添った提案をする',
  '価格や効果への異議に適切に対応する',
  '自然なクロージングを行う',
];

const EVALUATION_SYSTEM_PROMPT = `あなたは美容室スタッフの接客トレーニングを評価する専門家です。
ロールプレイの会話を分析し、詳細な評価とフィードバックを提供してください。

## 評価指標
1. 共感力 (20%): お客様の気持ちに寄り添えているか
2. 商品知識 (20%): 商品の特徴やメリットを的確に説明できているか
3. 質問力 (20%): オープン質問で悩みを引き出せているか
4. 異議対応 (20%): 価格や効果への不安に適切に対応できているか
5. クロージング力 (20%): 自然な流れで購入を促せているか

## 評価のポイント
- 具体的な改善点を3つ以上提示する
- 良かった点も必ず褒める
- 特に改善が必要な場面に対して模範解答を提示する
- 建設的で前向きなフィードバックを心がける

## 出力形式（JSON）
{
  "overallScore": 0-100の数値,
  "metrics": {
    "empathy": { "score": 0-100, "details": "評価詳細" },
    "productKnowledge": { "score": 0-100, "details": "評価詳細" },
    "questioningSkill": { "score": 0-100, "details": "評価詳細" },
    "objectionHandling": { "score": 0-100, "details": "評価詳細" },
    "closingSkill": { "score": 0-100, "details": "評価詳細" }
  },
  "feedback": "総合的なフィードバック（3-4文）",
  "improvements": ["改善点1", "改善点2", "改善点3"],
  "strengths": ["良かった点1", "良かった点2"],
  "modelAnswers": [
    {
      "situation": "場面の説明",
      "stylistResponse": "実際の返答",
      "modelAnswer": "模範解答",
      "reasoning": "なぜこの返答が良いか"
    }
  ]
}`;

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
    const body: EvaluateRoleplayRequest = await req.json();

    if (!body.messages || body.messages.length === 0) {
      return errorResponse('VAL_001', 'messages are required', 400);
    }

    // Get scenario if provided
    let objectives = body.objectives || DEFAULT_OBJECTIVES;
    let scenario = null;

    if (body.scenario_id) {
      const { data: scenarioData } = await supabase
        .from('training_scenarios')
        .select('*')
        .eq('id', body.scenario_id)
        .single();

      if (scenarioData) {
        scenario = scenarioData;
        if (scenarioData.objectives) {
          objectives = scenarioData.objectives;
        }
      }
    }

    // Format conversation for evaluation
    const conversation = body.messages
      .map((m) => `[${m.role === 'stylist' ? '美容師' : 'お客様'}] ${m.content}`)
      .join('\n');

    const contextInfo = scenario
      ? `\n\nシナリオ: ${scenario.title}\n顧客ペルソナ: ${JSON.stringify(scenario.customer_persona)}`
      : '';

    // Call Claude API for evaluation
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
        system: EVALUATION_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `以下のロールプレイ会話を評価してください。

## 評価目的
${objectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}
${contextInfo}

## 会話内容
${conversation}`,
          },
        ],
      }),
    });

    if (!claudeResponse.ok) {
      const error = await claudeResponse.text();
      console.error('Claude API error:', error);
      return errorResponse('AI_001', 'Failed to evaluate roleplay', 500);
    }

    const claudeResult = await claudeResponse.json();
    const evaluationText = claudeResult.content[0].text;

    // Parse JSON from Claude response
    let evaluation: EvaluationResult;
    try {
      const jsonMatch = evaluationText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        evaluation = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse Claude response:', parseError);
      return errorResponse('AI_003', 'Failed to parse evaluation result', 500);
    }

    // Calculate weighted overall score
    const weightedScore = Math.round(
      evaluation.metrics.empathy.score * 0.2 +
        evaluation.metrics.productKnowledge.score * 0.2 +
        evaluation.metrics.questioningSkill.score * 0.2 +
        evaluation.metrics.objectionHandling.score * 0.2 +
        evaluation.metrics.closingSkill.score * 0.2
    );
    evaluation.overallScore = weightedScore;

    // Save evaluation result if session ID provided
    if (body.session_id) {
      const { error: updateError } = await supabase
        .from('roleplay_sessions')
        .update({
          status: 'completed',
          evaluation,
          ended_at: new Date().toISOString(),
        })
        .eq('id', body.session_id);

      if (updateError) {
        console.error('Failed to save evaluation:', updateError);
      }

      // Update staff training stats
      await supabase.rpc('increment_training_count', {
        p_staff_id: staff.id,
        p_score: evaluation.overallScore,
      });
    }

    return jsonResponse({
      ...evaluation,
      session_id: body.session_id,
      scenario_id: body.scenario_id,
      message_count: body.messages.length,
      evaluated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in evaluate-roleplay:', error);

    if (error.message === 'Unauthorized') {
      return unauthorizedResponse();
    }

    return errorResponse('INTERNAL_ERROR', error.message, 500);
  }
});
