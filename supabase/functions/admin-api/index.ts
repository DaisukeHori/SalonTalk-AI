// ===========================================
// SalonTalk AI - Admin API Edge Function
// ===========================================
// Operator management API using Supabase Auth
// Security: Uses Supabase JWT (bcrypt, rate limiting built-in)
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

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace('/admin-api', '');

  // Create Supabase clients
  // Service role client for admin operations (bypasses RLS)
  const supabaseAdmin = createClient(
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
    const ip_address = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || null;
    const user_agent = req.headers.get('user-agent') || null;

    // ============================================================
    // Authenticate using Supabase Auth JWT
    // ============================================================

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return respond({ error: { code: 'UNAUTHORIZED', message: 'Authorization required' } }, 401);
    }

    const token = authHeader.substring(7);

    // Create client with user's token to verify it
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
      }
    );

    // Verify the JWT and get user
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return respond({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } }, 401);
    }

    // Check if user is an operator (exists in operator_admins table)
    const { data: operator, error: operatorError } = await supabaseAdmin
      .from('operator_admins')
      .select('id, email, name, role, is_active')
      .eq('id', user.id)
      .single();

    if (operatorError || !operator) {
      return respond({ error: { code: 'FORBIDDEN', message: 'Not an operator account' } }, 403);
    }

    if (!operator.is_active) {
      return respond({ error: { code: 'FORBIDDEN', message: 'Operator account is disabled' } }, 403);
    }

    const session: OperatorSession = {
      operator_id: operator.id,
      email: operator.email,
      name: operator.name,
      role: operator.role,
    };

    // Helper to check admin role
    const requireAdmin = () => {
      if (session.role !== 'operator_admin') {
        throw new Error('FORBIDDEN');
      }
    };

    // ============================================================
    // API Endpoints
    // ============================================================

    // GET /me - Get current operator info
    if (path === '/me' && req.method === 'GET') {
      // Update last login
      await supabaseAdmin
        .from('operator_admins')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', session.operator_id);

      return respond({ data: session });
    }

    // GET /dashboard - Get dashboard stats
    if (path === '/dashboard' && req.method === 'GET') {
      const { data, error } = await supabaseAdmin.rpc('admin_get_dashboard_stats');
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

      let query = supabaseAdmin
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

      const { data: salon, error: salonError } = await supabaseAdmin
        .from('salons')
        .select('*')
        .eq('id', salon_id)
        .single();

      if (salonError) throw salonError;

      const { data: stats, error: statsError } = await supabaseAdmin.rpc('admin_get_salon_stats', {
        p_salon_id: salon_id,
      });

      if (statsError) throw statsError;

      const { data: staffs, error: staffsError } = await supabaseAdmin
        .from('staffs')
        .select('id, name, email, role, is_active, created_at')
        .eq('salon_id', salon_id)
        .order('created_at', { ascending: true });

      if (staffsError) throw staffsError;

      const { data: devices, error: devicesError } = await supabaseAdmin
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

      const { data, error } = await supabaseAdmin.rpc('admin_update_salon_seats', {
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

      const { data, error } = await supabaseAdmin.rpc('admin_update_salon_plan', {
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

      const { data, error } = await supabaseAdmin.rpc('admin_suspend_salon', {
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

      const { data, error } = await supabaseAdmin.rpc('admin_unsuspend_salon', {
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

      let query = supabaseAdmin
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

      const { data: operators, error } = await supabaseAdmin
        .from('operator_admins')
        .select('id, email, name, role, last_login_at, is_active, created_at')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return respond({ data: operators });
    }

    // POST /operators - Create operator (admin only)
    // Note: This creates both auth.users entry AND operator_admins entry
    if (path === '/operators' && req.method === 'POST') {
      requireAdmin();
      const { email, password, name, role } = await req.json();

      if (!email || !password || !name) {
        return respond({ error: { code: 'INVALID_INPUT', message: 'Email, password, and name are required' } }, 400);
      }

      if (password.length < 8) {
        return respond({ error: { code: 'INVALID_INPUT', message: 'Password must be at least 8 characters' } }, 400);
      }

      const validRoles = ['operator_admin', 'operator_support'];
      const operatorRole = validRoles.includes(role) ? role : 'operator_support';

      // Create auth user via Supabase Auth Admin API
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email for operators
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          return respond({ error: { code: 'DUPLICATE_EMAIL', message: 'Email already exists' } }, 400);
        }
        throw authError;
      }

      // Create operator_admins entry
      const { data: operator, error: operatorError } = await supabaseAdmin
        .from('operator_admins')
        .insert({
          id: authData.user.id,
          email,
          name,
          role: operatorRole,
        })
        .select('id, email, name, role, created_at')
        .single();

      if (operatorError) {
        // Rollback: delete auth user if operator_admins insert fails
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw operatorError;
      }

      // Record audit log
      await supabaseAdmin.rpc('record_audit_log', {
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
