/**
 * Start Roleplay Edge Function
 * POST /start-roleplay
 *
 * Starts a new roleplay training session for a stylist
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { createSupabaseClient, getUser, getStaff } from '../_shared/supabase.ts';
import { jsonResponse, errorResponse, unauthorizedResponse } from '../_shared/response.ts';

interface StartRoleplayRequest {
  scenarioId: string;
}

interface CustomerPersona {
  name: string;
  ageGroup: string;
  gender: string;
  personality: string;
  concerns: string[];
  hairConcerns?: string[];
  purchaseHistory?: string[];
}

interface TrainingScenario {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  category: string;
  estimatedMinutes: number;
  objectives: string[];
  customerPersona: CustomerPersona;
  initialMessage?: string;
}

const buildInitialMessage = (persona: CustomerPersona): string => {
  // Generate a natural initial message based on persona
  const greetings = [
    'こんにちは。',
    'お願いします。',
    'はじめまして。',
  ];

  const concerns = persona.concerns || persona.hairConcerns || [];

  // Simple initial messages depending on personality
  if (persona.personality?.includes('控えめ')) {
    return `${greetings[0]}今日はカットでお願いします。`;
  }

  if (persona.personality?.includes('話好き')) {
    return `${greetings[0]}今日はカットとカラーで来ました。最近ちょっと髪の調子が良くなくて...`;
  }

  return `${greetings[0]}今日はカットでお願いします。`;
};

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
    const body: StartRoleplayRequest = await req.json();

    if (!body.scenarioId) {
      return errorResponse('VAL_001', 'scenarioId is required', 400);
    }

    // Fetch scenario
    const { data: scenarioData, error: scenarioError } = await supabase
      .from('training_scenarios')
      .select('*')
      .eq('id', body.scenarioId)
      .eq('is_active', true)
      .single();

    if (scenarioError || !scenarioData) {
      console.error('Error fetching scenario:', scenarioError);
      return errorResponse('NOT_FOUND', 'Scenario not found', 404);
    }

    const persona: CustomerPersona = {
      name: scenarioData.customer_persona?.name || 'お客様',
      ageGroup: scenarioData.customer_persona?.ageGroup || '30代',
      gender: scenarioData.customer_persona?.gender || '女性',
      personality: scenarioData.customer_persona?.personality || '普通',
      concerns: scenarioData.customer_persona?.concerns || scenarioData.customer_persona?.hairConcerns || [],
      hairConcerns: scenarioData.customer_persona?.hairConcerns,
      purchaseHistory: scenarioData.customer_persona?.purchaseHistory,
    };

    // Generate initial message
    const initialMessage = scenarioData.initial_message || buildInitialMessage(persona);

    // Create roleplay session record
    const { data: session, error: sessionError } = await supabase
      .from('roleplay_sessions')
      .insert({
        staff_id: staff.id,
        scenario_id: body.scenarioId,
        status: 'in_progress',
        messages: [
          {
            role: 'customer',
            content: initialMessage,
            timestamp: new Date().toISOString(),
          },
        ],
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (sessionError) {
      console.error('Error creating roleplay session:', sessionError);
      return errorResponse('DB_001', 'Failed to create roleplay session', 500);
    }

    // Build scenario response
    const scenario: TrainingScenario = {
      id: scenarioData.id,
      title: scenarioData.title,
      description: scenarioData.description,
      difficulty: scenarioData.difficulty || 'beginner',
      category: scenarioData.category || 'general',
      estimatedMinutes: scenarioData.estimated_minutes || 10,
      objectives: scenarioData.objectives || [],
      customerPersona: persona,
      initialMessage,
    };

    return jsonResponse({
      sessionId: session.id,
      initialMessage,
      scenario,
    });
  } catch (error) {
    console.error('Error in start-roleplay:', error);

    if (error.message === 'Unauthorized') {
      return unauthorizedResponse();
    }

    return errorResponse('INTERNAL_ERROR', error.message, 500);
  }
});
