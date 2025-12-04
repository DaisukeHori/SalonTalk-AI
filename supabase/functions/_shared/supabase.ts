/**
 * Supabase Client Utilities for Edge Functions
 */
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Create authenticated Supabase client from request or auth header string
 */
export function createSupabaseClient(reqOrAuthHeader: Request | string): SupabaseClient {
  // Support both Request object and auth header string for backwards compatibility
  const authHeader = typeof reqOrAuthHeader === 'string'
    ? reqOrAuthHeader
    : reqOrAuthHeader.headers.get('Authorization');

  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: authHeader ? { Authorization: authHeader } : {},
      },
    }
  );
}

/**
 * Create Supabase admin client (for service role operations)
 */
export function createSupabaseAdminClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

/**
 * Get authenticated user from request
 */
export async function getUser(supabase: SupabaseClient) {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Unauthorized');
  }

  return user;
}

/**
 * Get staff info for authenticated user
 */
export async function getStaff(supabase: SupabaseClient, userId: string) {
  const { data: staff, error } = await supabase
    .from('staffs')
    .select('*, salon:salons(*)')
    .eq('id', userId)
    .single();

  if (error || !staff) {
    throw new Error('Staff not found');
  }

  return staff;
}
