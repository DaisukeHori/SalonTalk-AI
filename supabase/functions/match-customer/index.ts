/**
 * Match Customer by Voice Print Edge Function
 * POST /match-customer
 *
 * Matches a customer by their voice embedding using pgvector similarity search.
 * If no match found, optionally creates a new customer record.
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { createSupabaseClient, getUser, getStaff } from '../_shared/supabase.ts';
import {
  jsonResponse,
  errorResponse,
  unauthorizedResponse,
} from '../_shared/response.ts';

interface MatchCustomerRequest {
  session_id: string;
  embedding: number[];
  threshold?: number;
  create_if_not_found?: boolean;
}

interface MatchedCustomer {
  id: string;
  name: string | null;
  similarity: number;
  total_visits: number;
  last_visit_at: string;
}

type ConfidenceLevel = 'high' | 'medium' | 'low' | 'none';

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
    const body: MatchCustomerRequest = await req.json();

    // Validate required fields
    if (!body.session_id) {
      return errorResponse('VAL_001', 'session_id is required', 400);
    }

    if (!body.embedding || !Array.isArray(body.embedding)) {
      return errorResponse('VAL_002', 'embedding is required and must be an array', 400);
    }

    if (body.embedding.length !== 512) {
      return errorResponse(
        'VAL_003',
        `embedding must be 512-dimensional, got ${body.embedding.length}`,
        400
      );
    }

    const threshold = body.threshold ?? 0.65;
    const createIfNotFound = body.create_if_not_found ?? true;

    // Search for matching customer by voice embedding
    const { data: matches, error: searchError } = await supabase.rpc(
      'match_customer_by_voice',
      {
        query_embedding: body.embedding,
        salon_id_param: staff.salon_id,
        match_threshold: threshold,
        match_count: 5,
      }
    );

    if (searchError) {
      console.error('Voice matching error:', searchError);
      return errorResponse('DB_001', 'Failed to search customers', 500);
    }

    let customerId: string | null = null;
    let customerName: string | null = null;
    let confidence: ConfidenceLevel = 'none';
    let isNewCustomer = false;
    let matchedCustomer: MatchedCustomer | null = null;

    if (matches && matches.length > 0) {
      const topMatch = matches[0];
      matchedCustomer = topMatch as MatchedCustomer;

      // Determine confidence level
      if (topMatch.similarity >= 0.85) {
        confidence = 'high';
      } else if (topMatch.similarity >= 0.75) {
        confidence = 'medium';
      } else if (topMatch.similarity >= 0.65) {
        confidence = 'low';
      }

      customerId = topMatch.id;
      customerName = topMatch.name;

      // Update the customer's voice embedding using weighted average
      const { error: updateError } = await supabase.rpc('update_customer_embedding', {
        customer_id_param: customerId,
        new_embedding: body.embedding,
      });

      if (updateError) {
        console.error('Embedding update error:', updateError);
        // Non-fatal, continue
      }
    } else if (createIfNotFound) {
      // Create new customer with this voice embedding
      const { data: newCustomerId, error: createError } = await supabase.rpc(
        'create_customer_with_embedding',
        {
          salon_id_param: staff.salon_id,
          name_param: null,
          embedding_param: body.embedding,
          metadata_param: {},
        }
      );

      if (createError) {
        console.error('Customer creation error:', createError);
        return errorResponse('DB_002', 'Failed to create customer', 500);
      }

      customerId = newCustomerId;
      isNewCustomer = true;
    }

    // Update session with customer_id if we have one
    if (customerId) {
      const { error: sessionError } = await supabase
        .from('sessions')
        .update({ customer_id: customerId })
        .eq('id', body.session_id)
        .eq('salon_id', staff.salon_id);

      if (sessionError) {
        console.error('Session update error:', sessionError);
        // Non-fatal, continue
      }
    }

    return jsonResponse({
      customer_id: customerId,
      customer_name: customerName,
      confidence,
      is_new_customer: isNewCustomer,
      match: matchedCustomer
        ? {
            similarity: matchedCustomer.similarity,
            total_visits: matchedCustomer.total_visits,
            last_visit_at: matchedCustomer.last_visit_at,
          }
        : null,
    });
  } catch (error) {
    console.error('Error in match-customer:', error);

    if (error.message === 'Unauthorized') {
      return unauthorizedResponse();
    }

    return errorResponse('INTERNAL_ERROR', error.message, 500);
  }
});
