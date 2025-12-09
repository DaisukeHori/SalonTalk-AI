// ===========================================
// SalonTalk AI - Admin API Edge Function
// ===========================================
// Operator management API for admin dashboard
// ===========================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Types
interface OperatorSession {
  operator_id: string;
  email: string;
  name: string;
  role: 'operator_admin' | 'operator_support';
}

interface ApiResponse<T = unknown> {
  data?: T;
  error?: { code: string; message: string };
}

// JWT secret for operator tokens (separate from Supabase auth)
const OPERATOR_JWT_SECRET = Deno.env.get('OPERATOR_JWT_SECRET') || 'operator-secret-key';

// Simple JWT implementation for operator auth
async function createOperatorToken(payload: OperatorSession): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + 8 * 60 * 60, // 8 hours
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header));
  const payloadB64 = btoa(JSON.stringify(tokenPayload));

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(OPERATOR_JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${headerB64}.${payloadB64}`)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

async function verifyOperatorToken(token: string): Promise<OperatorSession | null> {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split('.');
    if (!headerB64 || !payloadB64 || !signatureB64) return null;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(OPERATOR_JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signature = Uint8Array.from(atob(signatureB64), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      encoder.encode(`${headerB64}.${payloadB64}`)
    );

    if (!valid) return null;

    const payload = JSON.parse(atob(payloadB64));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return {
      operator_id: payload.operator_id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

// TOTP verification (simplified - in production use a proper library)
function verifyTOTP(secret: string, code: string): boolean {
  // For MVP, we'll implement basic TOTP verification
  // In production, use a proper TOTP library
  const timeStep = Math.floor(Date.now() / 30000);

  // Generate expected codes for current and adjacent time windows
  for (let i = -1; i <= 1; i++) {
    const expectedCode = generateTOTP(secret, timeStep + i);
    if (expectedCode === code) return true;
  }
  return false;
}

function generateTOTP(secret: string, counter: number): string {
  // Simplified TOTP - in production use proper HMAC-SHA1
  // This is a placeholder that generates deterministic 6-digit codes
  const hash = (secret + counter.toString()).split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  return Math.abs(hash % 1000000).toString().padStart(6, '0');
}

// Password hashing (using Web Crypto API)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const inputHash = await hashPassword(password);
  return inputHash === hash;
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace('/admin-api', '');

  // Create Supabase client with service role for admin operations
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const respond = <T>(data: ApiResponse<T>, status = 200) => {
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    });
  };

  try {
    // Get client info for audit logging
    const ip_address = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
    const user_agent = req.headers.get('user-agent') || 'unknown';

    // ============================================================
    // Public endpoints (no auth required)
    // ============================================================

    // POST /login - Operator login
    if (path === '/login' && req.method === 'POST') {
      const { email, password, mfa_code } = await req.json();

      if (!email || !password) {
        return respond({ error: { code: 'INVALID_INPUT', message: 'Email and password are required' } }, 400);
      }

      // Find operator
      const { data: operator, error: findError } = await supabase
        .from('operator_admins')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .single();

      if (findError || !operator) {
        return respond({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } }, 401);
      }

      // Verify password
      const validPassword = await verifyPassword(password, operator.password_hash);
      if (!validPassword) {
        return respond({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } }, 401);
      }

      // Check MFA if enabled
      if (operator.mfa_enabled) {
        if (!mfa_code) {
          return respond({ error: { code: 'MFA_REQUIRED', message: 'MFA code is required' } }, 401);
        }
        if (!verifyTOTP(operator.mfa_secret, mfa_code)) {
          return respond({ error: { code: 'INVALID_MFA', message: 'Invalid MFA code' } }, 401);
        }
      }

      // Update last login
      await supabase
        .from('operator_admins')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', operator.id);

      // Record audit log
      await supabase.rpc('record_audit_log', {
        p_operator_id: operator.id,
        p_action: 'operator.login',
        p_target_type: 'operator',
        p_target_id: operator.id,
        p_target_name: operator.email,
        p_details: {},
        p_ip_address: ip_address,
        p_user_agent: user_agent,
      });

      // Create token
      const token = await createOperatorToken({
        operator_id: operator.id,
        email: operator.email,
        name: operator.name,
        role: operator.role,
      });

      return respond({
        data: {
          token,
          operator: {
            id: operator.id,
            email: operator.email,
            name: operator.name,
            role: operator.role,
          },
        },
      });
    }

    // ============================================================
    // Protected endpoints (auth required)
    // ============================================================

    // Verify operator token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return respond({ error: { code: 'UNAUTHORIZED', message: 'Authorization required' } }, 401);
    }

    const token = authHeader.substring(7);
    const session = await verifyOperatorToken(token);
    if (!session) {
      return respond({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } }, 401);
    }

    // Helper to check admin role
    const requireAdmin = () => {
      if (session.role !== 'operator_admin') {
        throw new Error('FORBIDDEN');
      }
    };

    // GET /me - Get current operator info
    if (path === '/me' && req.method === 'GET') {
      return respond({ data: session });
    }

    // GET /dashboard - Get dashboard stats
    if (path === '/dashboard' && req.method === 'GET') {
      const { data, error } = await supabase.rpc('admin_get_dashboard_stats');
      if (error) throw error;
      return respond({ data });
    }

    // GET /salons - List salons with search and pagination
    if (path === '/salons' && req.method === 'GET') {
      const search = url.searchParams.get('search') || '';
      const status = url.searchParams.get('status') || '';
      const plan = url.searchParams.get('plan') || '';
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const offset = (page - 1) * limit;

      let query = supabase
        .from('salons')
        .select('*, staffs(count)', { count: 'exact' });

      if (search) {
        query = query.or(`name.ilike.%${search}%,id::text.ilike.%${search}%`);
      }
      if (status) {
        query = query.eq('status', status);
      }
      if (plan) {
        query = query.eq('plan', plan);
      }

      const { data: salons, count, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return respond({
        data: {
          salons,
          pagination: {
            page,
            limit,
            total: count || 0,
            total_pages: Math.ceil((count || 0) / limit),
          },
        },
      });
    }

    // GET /salons/:id - Get salon details with stats
    if (path.match(/^\/salons\/[^/]+$/) && req.method === 'GET') {
      const salon_id = path.split('/')[2];

      const { data: salon, error: salonError } = await supabase
        .from('salons')
        .select('*')
        .eq('id', salon_id)
        .single();

      if (salonError) throw salonError;

      const { data: stats, error: statsError } = await supabase.rpc('admin_get_salon_stats', {
        p_salon_id: salon_id,
      });

      if (statsError) throw statsError;

      const { data: staffs, error: staffsError } = await supabase
        .from('staffs')
        .select('id, name, email, role, is_active, created_at')
        .eq('salon_id', salon_id)
        .order('created_at', { ascending: true });

      if (staffsError) throw staffsError;

      const { data: devices, error: devicesError } = await supabase
        .from('devices')
        .select('id, device_name, seat_number, status, last_active_at')
        .eq('salon_id', salon_id)
        .order('seat_number', { ascending: true });

      if (devicesError) throw devicesError;

      return respond({
        data: {
          ...salon,
          stats,
          staffs,
          devices,
        },
      });
    }

    // PATCH /salons/:id/seats - Update seats count
    if (path.match(/^\/salons\/[^/]+\/seats$/) && req.method === 'PATCH') {
      const salon_id = path.split('/')[2];
      const { seats_count, reason } = await req.json();

      if (typeof seats_count !== 'number' || seats_count < 1 || seats_count > 100) {
        return respond({ error: { code: 'INVALID_INPUT', message: 'seats_count must be between 1 and 100' } }, 400);
      }

      const { data, error } = await supabase.rpc('admin_update_salon_seats', {
        p_operator_id: session.operator_id,
        p_salon_id: salon_id,
        p_new_seats_count: seats_count,
        p_reason: reason || null,
        p_ip_address: ip_address,
        p_user_agent: user_agent,
      });

      if (error) throw error;
      return respond({ data });
    }

    // PATCH /salons/:id/plan - Update plan (admin only)
    if (path.match(/^\/salons\/[^/]+\/plan$/) && req.method === 'PATCH') {
      requireAdmin();
      const salon_id = path.split('/')[2];
      const { plan, reason } = await req.json();

      const validPlans = ['free', 'standard', 'premium', 'enterprise'];
      if (!validPlans.includes(plan)) {
        return respond({ error: { code: 'INVALID_INPUT', message: 'Invalid plan' } }, 400);
      }

      const { data, error } = await supabase.rpc('admin_update_salon_plan', {
        p_operator_id: session.operator_id,
        p_salon_id: salon_id,
        p_new_plan: plan,
        p_reason: reason || null,
        p_ip_address: ip_address,
        p_user_agent: user_agent,
      });

      if (error) throw error;
      return respond({ data });
    }

    // POST /salons/:id/suspend - Suspend salon (admin only)
    if (path.match(/^\/salons\/[^/]+\/suspend$/) && req.method === 'POST') {
      requireAdmin();
      const salon_id = path.split('/')[2];
      const { reason, internal_note } = await req.json();

      if (!reason) {
        return respond({ error: { code: 'INVALID_INPUT', message: 'Reason is required' } }, 400);
      }

      const { data, error } = await supabase.rpc('admin_suspend_salon', {
        p_operator_id: session.operator_id,
        p_salon_id: salon_id,
        p_reason: reason,
        p_internal_note: internal_note || null,
        p_ip_address: ip_address,
        p_user_agent: user_agent,
      });

      if (error) throw error;
      return respond({ data });
    }

    // POST /salons/:id/unsuspend - Unsuspend salon (admin only)
    if (path.match(/^\/salons\/[^/]+\/unsuspend$/) && req.method === 'POST') {
      requireAdmin();
      const salon_id = path.split('/')[2];
      const { note } = await req.json();

      const { data, error } = await supabase.rpc('admin_unsuspend_salon', {
        p_operator_id: session.operator_id,
        p_salon_id: salon_id,
        p_note: note || null,
        p_ip_address: ip_address,
        p_user_agent: user_agent,
      });

      if (error) throw error;
      return respond({ data });
    }

    // GET /audit-logs - List audit logs (admin only)
    if (path === '/audit-logs' && req.method === 'GET') {
      requireAdmin();

      const operator_id = url.searchParams.get('operator_id') || '';
      const action = url.searchParams.get('action') || '';
      const target_type = url.searchParams.get('target_type') || '';
      const target_id = url.searchParams.get('target_id') || '';
      const from_date = url.searchParams.get('from') || '';
      const to_date = url.searchParams.get('to') || '';
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = (page - 1) * limit;

      let query = supabase
        .from('audit_logs')
        .select('*, operator:operator_admins(id, email, name)', { count: 'exact' });

      if (operator_id) {
        query = query.eq('operator_id', operator_id);
      }
      if (action) {
        query = query.ilike('action', `%${action}%`);
      }
      if (target_type) {
        query = query.eq('target_type', target_type);
      }
      if (target_id) {
        query = query.eq('target_id', target_id);
      }
      if (from_date) {
        query = query.gte('created_at', from_date);
      }
      if (to_date) {
        query = query.lte('created_at', to_date);
      }

      const { data: logs, count, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return respond({
        data: {
          logs,
          pagination: {
            page,
            limit,
            total: count || 0,
            total_pages: Math.ceil((count || 0) / limit),
          },
        },
      });
    }

    // GET /operators - List operators (admin only)
    if (path === '/operators' && req.method === 'GET') {
      requireAdmin();

      const { data: operators, error } = await supabase
        .from('operator_admins')
        .select('id, email, name, role, mfa_enabled, last_login_at, is_active, created_at')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return respond({ data: operators });
    }

    // POST /operators - Create operator (admin only)
    if (path === '/operators' && req.method === 'POST') {
      requireAdmin();
      const { email, password, name, role } = await req.json();

      if (!email || !password || !name) {
        return respond({ error: { code: 'INVALID_INPUT', message: 'Email, password, and name are required' } }, 400);
      }

      const password_hash = await hashPassword(password);
      const validRoles = ['operator_admin', 'operator_support'];
      const operatorRole = validRoles.includes(role) ? role : 'operator_support';

      const { data: operator, error } = await supabase
        .from('operator_admins')
        .insert({
          email,
          password_hash,
          name,
          role: operatorRole,
        })
        .select('id, email, name, role, created_at')
        .single();

      if (error) {
        if (error.code === '23505') {
          return respond({ error: { code: 'DUPLICATE_EMAIL', message: 'Email already exists' } }, 400);
        }
        throw error;
      }

      // Record audit log
      await supabase.rpc('record_audit_log', {
        p_operator_id: session.operator_id,
        p_action: 'operator.create',
        p_target_type: 'operator',
        p_target_id: operator.id,
        p_target_name: operator.email,
        p_details: { role: operatorRole },
        p_ip_address: ip_address,
        p_user_agent: user_agent,
      });

      return respond({ data: operator }, 201);
    }

    // 404 - Not found
    return respond({ error: { code: 'NOT_FOUND', message: 'Endpoint not found' } }, 404);

  } catch (error) {
    console.error('Admin API Error:', error);

    if (error.message === 'FORBIDDEN') {
      return respond({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } }, 403);
    }

    return respond({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Internal server error',
      },
    }, 500);
  }
});
