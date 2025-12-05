/**
 * Roleplay Chat Edge Function
 * POST /roleplay-chat
 *
 * AI-powered roleplay training for stylists
 * Uses Claude API to simulate customer conversations
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

interface RoleplayChatRequest {
  scenario_id?: string;
  session_id?: string;
  user_message: string;
  conversation_history?: RoleplayMessage[];
}

interface CustomerPersona {
  name: string;
  ageGroup: string;
  gender: string;
  hairConcerns: string[];
  personality: string;
  purchaseHistory: string[];
}

interface Scenario {
  id: string;
  title: string;
  description: string;
  customer_persona: CustomerPersona;
  objectives: string[];
  difficulty: string;
}

const buildSystemPrompt = (persona: CustomerPersona, objectives: string[]): string => {
  return `あなたは美容室のお客様役を演じるAIです。以下のペルソナと設定に従って会話してください。

## あなたの設定
- 名前: ${persona.name}
- 年代: ${persona.ageGroup}
- 性別: ${persona.gender}
- 髪の悩み: ${persona.hairConcerns.join('、')}
- 性格: ${persona.personality}
- 過去の購入履歴: ${persona.purchaseHistory.length > 0 ? persona.purchaseHistory.join('、') : 'なし'}

## シナリオの目的
${objectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}

## ロールプレイのルール
1. 自然な日本語で会話してください
2. 最初は控えめに、徐々に悩みを打ち明けてください
3. 美容師からの提案に対して、現実的な反応をしてください
4. 価格や効果についての質問・異議を適度に出してください
5. 良い提案には肯定的に、押し売りには否定的に反応してください
6. 1回の返答は2-3文程度に抑えてください

## 出力形式
会話の返答のみを出力してください。説明文や括弧書きは不要です。`;
};

const buildEvaluationPrompt = (
  messages: RoleplayMessage[],
  objectives: string[]
): string => {
  const conversation = messages
    .map((m) => `[${m.role === 'stylist' ? '美容師' : 'お客様'}] ${m.content}`)
    .join('\n');

  return `以下の美容室での会話を評価してください。

## 会話内容
${conversation}

## 評価基準
${objectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}

## 出力形式（JSON）
{
  "overallScore": 0-100の数値,
  "metrics": {
    "talkRatio": { "score": 0-100, "details": "説明" },
    "questionQuality": { "score": 0-100, "details": "説明" },
    "emotion": { "score": 0-100, "details": "説明" },
    "proposalTiming": { "score": 0-100, "details": "説明" },
    "proposalQuality": { "score": 0-100, "details": "説明" }
  },
  "feedback": "総合的なフィードバック（2-3文）",
  "improvements": ["改善点1", "改善点2", "改善点3"],
  "modelAnswer": "この場面での模範解答例（1-2文）"
}`;
};

const DEFAULT_PERSONA: CustomerPersona = {
  name: '佐藤さん',
  ageGroup: '30代',
  gender: '女性',
  hairConcerns: ['乾燥', 'パサつき'],
  personality: 'やや控えめ、初対面では警戒心がある',
  purchaseHistory: [],
};

const DEFAULT_OBJECTIVES = [
  'お客様の悩みを引き出す',
  '適切なタイミングで商品を提案する',
  '押し売りではなく、お客様に寄り添った提案をする',
];

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
    const body: RoleplayChatRequest = await req.json();

    if (!body.user_message) {
      return errorResponse('VAL_001', 'user_message is required', 400);
    }

    // Get scenario if provided
    let scenario: Scenario | null = null;
    let persona = DEFAULT_PERSONA;
    let objectives = DEFAULT_OBJECTIVES;

    if (body.scenario_id) {
      const { data: scenarioData, error: scenarioError } = await supabase
        .from('training_scenarios')
        .select('*')
        .eq('id', body.scenario_id)
        .single();

      if (!scenarioError && scenarioData) {
        scenario = scenarioData as Scenario;
        persona = scenario.customer_persona;
        objectives = scenario.objectives;
      }
    }

    // Build conversation history
    const history = body.conversation_history ?? [];
    const conversationMessages = history.map((m) => ({
      role: m.role === 'stylist' ? 'user' : 'assistant',
      content: m.content,
    }));

    // Add current user message
    conversationMessages.push({
      role: 'user',
      content: body.user_message,
    });

    // Call Claude API for roleplay response
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
        max_tokens: 500,
        system: buildSystemPrompt(persona, objectives),
        messages: conversationMessages,
      }),
    });

    if (!claudeResponse.ok) {
      const error = await claudeResponse.text();
      console.error('Claude API error:', error);
      return errorResponse('AI_001', 'Failed to generate response', 500);
    }

    const claudeResult = await claudeResponse.json();
    const aiResponse = claudeResult.content[0].text;

    // Check if conversation should end (customer agrees to purchase or explicitly refuses)
    const isCompleted =
      aiResponse.includes('買います') ||
      aiResponse.includes('購入します') ||
      aiResponse.includes('お願いします') ||
      aiResponse.includes('考えておきます') ||
      aiResponse.includes('今回は結構です') ||
      history.length >= 10; // Max 10 turns

    // Generate evaluation if completed
    let evaluation = null;
    if (isCompleted) {
      const allMessages: RoleplayMessage[] = [
        ...history,
        {
          role: 'stylist',
          content: body.user_message,
          timestamp: new Date().toISOString(),
        },
        {
          role: 'customer',
          content: aiResponse,
          timestamp: new Date().toISOString(),
        },
      ];

      const evalResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: buildEvaluationPrompt(allMessages, objectives),
            },
          ],
        }),
      });

      if (evalResponse.ok) {
        const evalResult = await evalResponse.json();
        const evalText = evalResult.content[0].text;
        try {
          const jsonMatch = evalText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            evaluation = JSON.parse(jsonMatch[0]);
          }
        } catch (e) {
          console.error('Failed to parse evaluation:', e);
        }
      }

      // Save roleplay session if we have a session ID
      if (body.session_id) {
        await supabase
          .from('roleplay_sessions')
          .update({
            status: 'completed',
            messages: allMessages,
            evaluation,
            ended_at: new Date().toISOString(),
          })
          .eq('id', body.session_id);
      }
    }

    // Generate hint for stylist
    let hint: string | null = null;
    if (!isCompleted && history.length >= 2) {
      // Generate contextual hint based on conversation
      if (aiResponse.includes('高い') || aiResponse.includes('値段')) {
        hint = '価格への異議が出ています。コストパフォーマンスや長期的な効果を説明してみましょう。';
      } else if (aiResponse.includes('今使ってる') || aiResponse.includes('別の')) {
        hint = '既存製品への愛着があります。違いや併用のメリットを説明してみましょう。';
      } else if (aiResponse.includes('悩み') || aiResponse.includes('困って')) {
        hint = 'お客様が悩みを打ち明けています。共感を示しながら詳しく聞いてみましょう。';
      }
    }

    return jsonResponse({
      ai_response: aiResponse,
      hint,
      is_completed: isCompleted,
      evaluation,
      message_count: history.length + 1,
    });
  } catch (error) {
    console.error('Error in roleplay-chat:', error);

    if (error.message === 'Unauthorized') {
      return unauthorizedResponse();
    }

    return errorResponse('INTERNAL_ERROR', error.message, 500);
  }
});
