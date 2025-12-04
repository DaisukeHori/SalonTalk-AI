/**
 * Get Training Scenario Edge Function
 * GET /get-training-scenario?id={scenarioId}
 *
 * Retrieves a training scenario by ID for roleplay training
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { createSupabaseClient, getUser, getStaff } from '../_shared/supabase.ts';
import { jsonResponse, errorResponse, unauthorizedResponse } from '../_shared/response.ts';

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
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  estimatedMinutes: number;
  objectives: string[];
  customerPersona: CustomerPersona;
  initialMessage?: string;
  tips?: string[];
  createdAt: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = createSupabaseClient(req);

    // Verify authentication
    const user = await getUser(supabase);
    await getStaff(supabase, user.id);

    // Get scenario ID from query params
    const url = new URL(req.url);
    const scenarioId = url.searchParams.get('id');

    if (!scenarioId) {
      return errorResponse('VAL_001', 'Scenario ID is required', 400);
    }

    // Fetch scenario from database
    const { data: scenario, error: scenarioError } = await supabase
      .from('training_scenarios')
      .select('*')
      .eq('id', scenarioId)
      .eq('is_active', true)
      .single();

    if (scenarioError || !scenario) {
      console.error('Error fetching scenario:', scenarioError);
      return errorResponse('NOT_FOUND', 'Scenario not found', 404);
    }

    // Map database fields to response format
    const response: TrainingScenario = {
      id: scenario.id,
      title: scenario.title,
      description: scenario.description,
      difficulty: scenario.difficulty || 'beginner',
      category: scenario.category || 'general',
      estimatedMinutes: scenario.estimated_minutes || 10,
      objectives: scenario.objectives || [],
      customerPersona: {
        name: scenario.customer_persona?.name || 'お客様',
        ageGroup: scenario.customer_persona?.ageGroup || '30代',
        gender: scenario.customer_persona?.gender || '女性',
        personality: scenario.customer_persona?.personality || '普通',
        concerns: scenario.customer_persona?.concerns || scenario.customer_persona?.hairConcerns || [],
        hairConcerns: scenario.customer_persona?.hairConcerns,
        purchaseHistory: scenario.customer_persona?.purchaseHistory,
      },
      initialMessage: scenario.initial_message || null,
      tips: scenario.tips || null,
      createdAt: scenario.created_at,
    };

    return jsonResponse(response);
  } catch (error) {
    console.error('Error in get-training-scenario:', error);

    if (error.message === 'Unauthorized') {
      return unauthorizedResponse();
    }

    return errorResponse('INTERNAL_ERROR', error.message, 500);
  }
});
