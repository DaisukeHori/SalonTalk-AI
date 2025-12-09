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
      // RPC returns an array of rows, take the first one
      const stats = Array.isArray(data) ? data[0] : data;
      return respond({ data: stats });
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
        // Only search by name (UUID search is complex)
        query = query.ilike('name', `%${search}%`);
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

      // Get old value for audit log
      const { data: oldSalon } = await supabaseAdmin
        .from('salons')
        .select('seats_count')
        .eq('id', salon_id)
        .single();

      // Update salon
      const { error: updateError } = await supabaseAdmin
        .from('salons')
        .update({ seats_count })
        .eq('id', salon_id);

      if (updateError) throw updateError;

      // Record audit log
      await supabaseAdmin.rpc('record_audit_log', {
        p_operator_id: session.operator_id,
        p_action: 'salon.seats_change',
        p_target_type: 'salon',
        p_target_id: salon_id,
        p_target_name: null,
        p_details: { old_seats: oldSalon?.seats_count, new_seats: seats_count, reason },
        p_ip_address: ip_address,
        p_user_agent: user_agent,
      });

      return respond({ data: { success: true, message: 'Seats count updated successfully' } });
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

      // Get old value for audit log
      const { data: oldSalon } = await supabaseAdmin
        .from('salons')
        .select('plan')
        .eq('id', salon_id)
        .single();

      // Update salon
      const { error: updateError } = await supabaseAdmin
        .from('salons')
        .update({ plan })
        .eq('id', salon_id);

      if (updateError) throw updateError;

      // Record audit log
      await supabaseAdmin.rpc('record_audit_log', {
        p_operator_id: session.operator_id,
        p_action: 'salon.plan_change',
        p_target_type: 'salon',
        p_target_id: salon_id,
        p_target_name: null,
        p_details: { old_plan: oldSalon?.plan, new_plan: plan, reason },
        p_ip_address: ip_address,
        p_user_agent: user_agent,
      });

      return respond({ data: { success: true, message: 'Plan updated successfully' } });
    }

    // POST /salons/:id/suspend - Suspend salon (admin only)
    if (path.match(/^\/salons\/[^/]+\/suspend$/) && req.method === 'POST') {
      requireAdmin();
      const salon_id = path.split('/')[2];
      const { reason, internal_note } = await req.json();

      if (!reason) {
        return respond({ error: { code: 'INVALID_INPUT', message: 'Reason is required' } }, 400);
      }

      // Update salon status
      const { error: updateError } = await supabaseAdmin
        .from('salons')
        .update({
          status: 'suspended',
          suspended_at: new Date().toISOString(),
          suspended_reason: reason,
          internal_note: internal_note || null,
        })
        .eq('id', salon_id);

      if (updateError) throw updateError;

      // Record audit log
      await supabaseAdmin.rpc('record_audit_log', {
        p_operator_id: session.operator_id,
        p_action: 'salon.suspend',
        p_target_type: 'salon',
        p_target_id: salon_id,
        p_target_name: null,
        p_details: { reason, internal_note },
        p_ip_address: ip_address,
        p_user_agent: user_agent,
      });

      return respond({ data: { success: true, message: 'Salon suspended successfully' } });
    }

    // POST /salons/:id/unsuspend - Unsuspend salon (admin only)
    if (path.match(/^\/salons\/[^/]+\/unsuspend$/) && req.method === 'POST') {
      requireAdmin();
      const salon_id = path.split('/')[2];
      const { note } = await req.json();

      // Update salon status
      const { error: updateError } = await supabaseAdmin
        .from('salons')
        .update({
          status: 'active',
          suspended_at: null,
          suspended_reason: null,
        })
        .eq('id', salon_id);

      if (updateError) throw updateError;

      // Record audit log
      await supabaseAdmin.rpc('record_audit_log', {
        p_operator_id: session.operator_id,
        p_action: 'salon.unsuspend',
        p_target_type: 'salon',
        p_target_id: salon_id,
        p_target_name: null,
        p_details: { note },
        p_ip_address: ip_address,
        p_user_agent: user_agent,
      });

      return respond({ data: { success: true, message: 'Salon unsuspended successfully' } });
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

    // POST /salons - Create salon
    if (path === '/salons' && req.method === 'POST') {
      const { name, plan, seats_count, owner_email, owner_name } = await req.json();

      if (!name) {
        return respond({ error: { code: 'INVALID_INPUT', message: 'Name is required' } }, 400);
      }

      const validPlans = ['free', 'standard', 'premium', 'enterprise'];
      const salonPlan = validPlans.includes(plan) ? plan : 'free';
      const salonSeats = seats_count && seats_count > 0 ? seats_count : 1;

      // Create salon
      const { data: salon, error: salonError } = await supabaseAdmin
        .from('salons')
        .insert({
          name,
          plan: salonPlan,
          seats_count: salonSeats,
        })
        .select('id, name, plan, seats_count')
        .single();

      if (salonError) throw salonError;

      // If owner info provided, create staff entry
      if (owner_email && owner_name) {
        // Create auth user for owner
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: owner_email,
          password: Math.random().toString(36).slice(-12), // Generate random password
          email_confirm: false, // Needs to set password via reset
        });

        if (!authError && authData.user) {
          await supabaseAdmin
            .from('staffs')
            .insert({
              id: authData.user.id,
              salon_id: salon.id,
              email: owner_email,
              name: owner_name,
              role: 'owner',
            });
        }
      }

      // Record audit log
      await supabaseAdmin.rpc('record_audit_log', {
        p_operator_id: session.operator_id,
        p_action: 'salon.create',
        p_target_type: 'salon',
        p_target_id: salon.id,
        p_target_name: salon.name,
        p_details: { plan: salonPlan, seats_count: salonSeats, owner_email },
        p_ip_address: ip_address,
        p_user_agent: user_agent,
      });

      return respond({ data: { salon_id: salon.id, message: 'Salon created successfully' } }, 201);
    }

    // GET /salons/:id/usage - Get salon usage stats
    if (path.match(/^\/salons\/[^/]+\/usage$/) && req.method === 'GET') {
      const salon_id = path.split('/')[2];

      // Get session counts for this month and last month
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

      // Sessions this month
      const { count: sessionsThisMonth } = await supabaseAdmin
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('salon_id', salon_id)
        .gte('started_at', thisMonthStart);

      // Sessions last month
      const { count: sessionsLastMonth } = await supabaseAdmin
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('salon_id', salon_id)
        .gte('started_at', lastMonthStart)
        .lte('started_at', lastMonthEnd);

      // Get average session duration and scores
      const { data: thisMonthStats } = await supabaseAdmin
        .from('sessions')
        .select('total_duration_ms')
        .eq('salon_id', salon_id)
        .gte('started_at', thisMonthStart)
        .not('total_duration_ms', 'is', null);

      const { data: lastMonthStats } = await supabaseAdmin
        .from('sessions')
        .select('total_duration_ms')
        .eq('salon_id', salon_id)
        .gte('started_at', lastMonthStart)
        .lte('started_at', lastMonthEnd)
        .not('total_duration_ms', 'is', null);

      // Calculate averages
      const avgDurationThis = thisMonthStats?.length
        ? thisMonthStats.reduce((a, b) => a + (b.total_duration_ms || 0), 0) / thisMonthStats.length / 60000
        : 0;
      const avgDurationLast = lastMonthStats?.length
        ? lastMonthStats.reduce((a, b) => a + (b.total_duration_ms || 0), 0) / lastMonthStats.length / 60000
        : 0;

      // Get report scores
      const { data: thisMonthReports } = await supabaseAdmin
        .from('session_reports')
        .select('overall_score, is_converted, sessions!inner(salon_id, started_at)')
        .eq('sessions.salon_id', salon_id)
        .gte('sessions.started_at', thisMonthStart);

      const { data: lastMonthReports } = await supabaseAdmin
        .from('session_reports')
        .select('overall_score, is_converted, sessions!inner(salon_id, started_at)')
        .eq('sessions.salon_id', salon_id)
        .gte('sessions.started_at', lastMonthStart)
        .lte('sessions.started_at', lastMonthEnd);

      const avgScoreThis = thisMonthReports?.length
        ? thisMonthReports.reduce((a, b) => a + (b.overall_score || 0), 0) / thisMonthReports.length
        : 0;
      const avgScoreLast = lastMonthReports?.length
        ? lastMonthReports.reduce((a, b) => a + (b.overall_score || 0), 0) / lastMonthReports.length
        : 0;

      const conversionsThis = thisMonthReports?.filter(r => r.is_converted)?.length || 0;
      const conversionsLast = lastMonthReports?.filter(r => r.is_converted)?.length || 0;
      const conversionRateThis = (sessionsThisMonth || 0) > 0 ? (conversionsThis / (sessionsThisMonth || 1)) * 100 : 0;
      const conversionRateLast = (sessionsLastMonth || 0) > 0 ? (conversionsLast / (sessionsLastMonth || 1)) * 100 : 0;

      // Get weekly data (last 7 days)
      const weeklyData = [];
      const weeklyConversions = [];
      for (let i = 6; i >= 0; i--) {
        const dayStart = new Date();
        dayStart.setDate(dayStart.getDate() - i);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);

        const { count } = await supabaseAdmin
          .from('sessions')
          .select('*', { count: 'exact', head: true })
          .eq('salon_id', salon_id)
          .gte('started_at', dayStart.toISOString())
          .lte('started_at', dayEnd.toISOString());

        const { count: converted } = await supabaseAdmin
          .from('session_reports')
          .select('*, sessions!inner(salon_id, started_at)', { count: 'exact', head: true })
          .eq('sessions.salon_id', salon_id)
          .eq('is_converted', true)
          .gte('sessions.started_at', dayStart.toISOString())
          .lte('sessions.started_at', dayEnd.toISOString());

        weeklyData.push(count || 0);
        weeklyConversions.push(converted || 0);
      }

      // Get monthly history (last 6 months)
      const monthlyHistory = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
        const monthLabel = `${monthStart.getFullYear()}年${monthStart.getMonth() + 1}月`;

        const { count: monthSessions } = await supabaseAdmin
          .from('sessions')
          .select('*', { count: 'exact', head: true })
          .eq('salon_id', salon_id)
          .gte('started_at', monthStart.toISOString())
          .lte('started_at', monthEnd.toISOString());

        const { data: monthReports } = await supabaseAdmin
          .from('session_reports')
          .select('overall_score, is_converted, sessions!inner(salon_id, started_at)')
          .eq('sessions.salon_id', salon_id)
          .gte('sessions.started_at', monthStart.toISOString())
          .lte('sessions.started_at', monthEnd.toISOString());

        const monthAvgScore = monthReports?.length
          ? monthReports.reduce((a, b) => a + (b.overall_score || 0), 0) / monthReports.length
          : 0;
        const monthConversions = monthReports?.filter(r => r.is_converted)?.length || 0;
        const monthConversionRate = (monthSessions || 0) > 0 ? ((monthConversions / (monthSessions || 1)) * 100).toFixed(0) + '%' : '0%';

        monthlyHistory.push({
          month: monthLabel,
          sessions: monthSessions || 0,
          avg_score: monthAvgScore,
          conversions: monthConversions,
          conversion_rate: monthConversionRate,
        });
      }

      return respond({
        data: {
          sessions_this_month: sessionsThisMonth || 0,
          sessions_last_month: sessionsLastMonth || 0,
          avg_session_duration_min: avgDurationThis,
          avg_session_duration_last_month_min: avgDurationLast,
          avg_talk_score: avgScoreThis,
          avg_talk_score_last_month: avgScoreLast,
          conversion_rate: conversionRateThis,
          conversion_rate_last_month: conversionRateLast,
          weekly_sessions: weeklyData,
          weekly_conversions: weeklyConversions,
          monthly_history: monthlyHistory,
        },
      });
    }

    // POST /salons/:id/staffs - Create staff
    if (path.match(/^\/salons\/[^/]+\/staffs$/) && req.method === 'POST') {
      const salon_id = path.split('/')[2];
      const { name, email, role, password } = await req.json();

      if (!name || !email) {
        return respond({ error: { code: 'INVALID_INPUT', message: 'Name and email are required' } }, 400);
      }

      const validRoles = ['stylist', 'manager', 'owner', 'admin'];
      const staffRole = validRoles.includes(role) ? role : 'stylist';

      // Create auth user
      const tempPassword = password || Math.random().toString(36).slice(-12);
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: !password, // If no password provided, user needs to reset
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          return respond({ error: { code: 'DUPLICATE_EMAIL', message: 'Email already exists' } }, 400);
        }
        throw authError;
      }

      // Create staff entry
      const { data: staff, error: staffError } = await supabaseAdmin
        .from('staffs')
        .insert({
          id: authData.user.id,
          salon_id,
          email,
          name,
          role: staffRole,
        })
        .select('id')
        .single();

      if (staffError) {
        // Rollback: delete auth user
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw staffError;
      }

      // Record audit log
      await supabaseAdmin.rpc('record_audit_log', {
        p_operator_id: session.operator_id,
        p_action: 'staff.create',
        p_target_type: 'salon',
        p_target_id: salon_id,
        p_target_name: name,
        p_details: { email, role: staffRole },
        p_ip_address: ip_address,
        p_user_agent: user_agent,
      });

      return respond({ data: { staff_id: staff.id, message: 'Staff created successfully' } }, 201);
    }

    // PATCH /salons/:id/staffs/:staffId - Update staff
    if (path.match(/^\/salons\/[^/]+\/staffs\/[^/]+$/) && req.method === 'PATCH') {
      const parts = path.split('/');
      const salon_id = parts[2];
      const staff_id = parts[4];
      const { name, role, is_active } = await req.json();

      // Build update object
      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData.name = name;
      if (role !== undefined) {
        const validRoles = ['stylist', 'manager', 'owner', 'admin'];
        if (!validRoles.includes(role)) {
          return respond({ error: { code: 'INVALID_INPUT', message: 'Invalid role' } }, 400);
        }
        updateData.role = role;
      }
      if (is_active !== undefined) updateData.is_active = is_active;

      if (Object.keys(updateData).length === 0) {
        return respond({ error: { code: 'INVALID_INPUT', message: 'No fields to update' } }, 400);
      }

      const { error: updateError } = await supabaseAdmin
        .from('staffs')
        .update(updateData)
        .eq('id', staff_id)
        .eq('salon_id', salon_id);

      if (updateError) throw updateError;

      // Record audit log
      await supabaseAdmin.rpc('record_audit_log', {
        p_operator_id: session.operator_id,
        p_action: 'staff.update',
        p_target_type: 'salon',
        p_target_id: salon_id,
        p_target_name: name || staff_id,
        p_details: updateData,
        p_ip_address: ip_address,
        p_user_agent: user_agent,
      });

      return respond({ data: { success: true, message: 'Staff updated successfully' } });
    }

    // DELETE /salons/:id/staffs/:staffId - Delete staff
    if (path.match(/^\/salons\/[^/]+\/staffs\/[^/]+$/) && req.method === 'DELETE') {
      const parts = path.split('/');
      const salon_id = parts[2];
      const staff_id = parts[4];

      // Get staff info before delete
      const { data: staff, error: getError } = await supabaseAdmin
        .from('staffs')
        .select('name, email')
        .eq('id', staff_id)
        .eq('salon_id', salon_id)
        .single();

      if (getError || !staff) {
        return respond({ error: { code: 'NOT_FOUND', message: 'Staff not found' } }, 404);
      }

      // Delete from staffs table
      const { error: deleteError } = await supabaseAdmin
        .from('staffs')
        .delete()
        .eq('id', staff_id)
        .eq('salon_id', salon_id);

      if (deleteError) throw deleteError;

      // Delete auth user
      await supabaseAdmin.auth.admin.deleteUser(staff_id);

      // Record audit log
      await supabaseAdmin.rpc('record_audit_log', {
        p_operator_id: session.operator_id,
        p_action: 'staff.delete',
        p_target_type: 'salon',
        p_target_id: salon_id,
        p_target_name: staff.name,
        p_details: { email: staff.email },
        p_ip_address: ip_address,
        p_user_agent: user_agent,
      });

      return respond({ data: { success: true, message: 'Staff deleted successfully' } });
    }

    // POST /salons/:id/devices - Create device
    if (path.match(/^\/salons\/[^/]+\/devices$/) && req.method === 'POST') {
      const salon_id = path.split('/')[2];
      const { device_name, seat_number } = await req.json();

      if (!device_name) {
        return respond({ error: { code: 'INVALID_INPUT', message: 'Device name is required' } }, 400);
      }

      // Create device (without activation code - activation codes are created separately by salon owners)
      const { data: device, error: deviceError } = await supabaseAdmin
        .from('devices')
        .insert({
          salon_id,
          device_name,
          seat_number: seat_number || null,
          status: 'pending',
        })
        .select('id')
        .single();

      if (deviceError) throw deviceError;

      // Record audit log
      await supabaseAdmin.rpc('record_audit_log', {
        p_operator_id: session.operator_id,
        p_action: 'device.create',
        p_target_type: 'salon',
        p_target_id: salon_id,
        p_target_name: device_name,
        p_details: { seat_number },
        p_ip_address: ip_address,
        p_user_agent: user_agent,
      });

      // Generate a simple display code for admin reference (not stored, just for display)
      const display_code = Math.random().toString().slice(2, 8);

      return respond({ data: { device_id: device.id, activation_code: display_code, message: 'Device created successfully. Activation code can be generated by salon owner.' } }, 201);
    }

    // PATCH /salons/:id/devices/:deviceId - Update device
    if (path.match(/^\/salons\/[^/]+\/devices\/[^/]+$/) && req.method === 'PATCH') {
      const parts = path.split('/');
      const salon_id = parts[2];
      const device_id = parts[4];
      const { device_name, seat_number, status: deviceStatus } = await req.json();

      // Build update object
      const updateData: Record<string, unknown> = {};
      if (device_name !== undefined) updateData.device_name = device_name;
      if (seat_number !== undefined) updateData.seat_number = seat_number;
      if (deviceStatus !== undefined) {
        const validStatuses = ['pending', 'active', 'inactive'];
        if (!validStatuses.includes(deviceStatus)) {
          return respond({ error: { code: 'INVALID_INPUT', message: 'Invalid status' } }, 400);
        }
        updateData.status = deviceStatus;
      }

      if (Object.keys(updateData).length === 0) {
        return respond({ error: { code: 'INVALID_INPUT', message: 'No fields to update' } }, 400);
      }

      const { error: updateError } = await supabaseAdmin
        .from('devices')
        .update(updateData)
        .eq('id', device_id)
        .eq('salon_id', salon_id);

      if (updateError) throw updateError;

      // Record audit log
      await supabaseAdmin.rpc('record_audit_log', {
        p_operator_id: session.operator_id,
        p_action: 'device.update',
        p_target_type: 'salon',
        p_target_id: salon_id,
        p_target_name: device_name || device_id,
        p_details: updateData,
        p_ip_address: ip_address,
        p_user_agent: user_agent,
      });

      return respond({ data: { success: true, message: 'Device updated successfully' } });
    }

    // DELETE /salons/:id/devices/:deviceId - Delete device
    if (path.match(/^\/salons\/[^/]+\/devices\/[^/]+$/) && req.method === 'DELETE') {
      const parts = path.split('/');
      const salon_id = parts[2];
      const device_id = parts[4];

      // Get device info before delete
      const { data: device, error: getError } = await supabaseAdmin
        .from('devices')
        .select('device_name')
        .eq('id', device_id)
        .eq('salon_id', salon_id)
        .single();

      if (getError || !device) {
        return respond({ error: { code: 'NOT_FOUND', message: 'Device not found' } }, 404);
      }

      const { error: deleteError } = await supabaseAdmin
        .from('devices')
        .delete()
        .eq('id', device_id)
        .eq('salon_id', salon_id);

      if (deleteError) throw deleteError;

      // Record audit log
      await supabaseAdmin.rpc('record_audit_log', {
        p_operator_id: session.operator_id,
        p_action: 'device.delete',
        p_target_type: 'salon',
        p_target_id: salon_id,
        p_target_name: device.device_name,
        p_details: {},
        p_ip_address: ip_address,
        p_user_agent: user_agent,
      });

      return respond({ data: { success: true, message: 'Device deleted successfully' } });
    }

    // PATCH /salons/:id/expiry - Update salon expiry
    if (path.match(/^\/salons\/[^/]+\/expiry$/) && req.method === 'PATCH') {
      const salon_id = path.split('/')[2];
      const { expiry_date, reason } = await req.json();

      const { error: updateError } = await supabaseAdmin
        .from('salons')
        .update({ expiry_date: expiry_date || null })
        .eq('id', salon_id);

      if (updateError) throw updateError;

      // Record audit log
      await supabaseAdmin.rpc('record_audit_log', {
        p_operator_id: session.operator_id,
        p_action: 'salon.expiry_change',
        p_target_type: 'salon',
        p_target_id: salon_id,
        p_target_name: null,
        p_details: { expiry_date, reason },
        p_ip_address: ip_address,
        p_user_agent: user_agent,
      });

      return respond({ data: { success: true, message: 'Expiry date updated successfully' } });
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
