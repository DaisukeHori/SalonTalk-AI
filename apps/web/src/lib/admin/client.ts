// ===========================================
// SalonTalk AI - Admin API Client
// ===========================================
// Uses Supabase Auth for authentication
// ===========================================

import { getSupabaseBrowserClient } from '@/lib/supabase/client';

const ADMIN_API_URL = process.env.NEXT_PUBLIC_SUPABASE_URL + '/functions/v1/admin-api';

// Types
export interface OperatorSession {
  operator_id: string;
  email: string;
  name: string;
  role: 'operator_admin' | 'operator_support';
}

export interface Salon {
  id: string;
  name: string;
  plan: 'free' | 'standard' | 'premium' | 'enterprise';
  seats_count: number;
  status: 'active' | 'suspended';
  suspended_at: string | null;
  suspended_reason: string | null;
  internal_note: string | null;
  expiry_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalonWithStats extends Salon {
  stats: {
    staff_count: number;
    active_device_count: number;
    total_sessions: number;
    sessions_this_month: number;
    last_session_at: string | null;
  };
  staffs: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    is_active: boolean;
    created_at: string;
  }>;
  devices: Array<{
    id: string;
    device_name: string;
    seat_number: number | null;
    status: string;
    last_active_at: string | null;
  }>;
}

export interface AuditLog {
  id: string;
  operator_id: string;
  action: string;
  target_type: 'salon' | 'operator' | 'system';
  target_id: string | null;
  target_name: string | null;
  details: Record<string, unknown>;
  ip_address: string;
  user_agent: string;
  created_at: string;
  operator: {
    id: string;
    email: string;
    name: string;
  };
}

export interface DashboardStats {
  total_salons: number;
  active_salons: number;
  suspended_salons: number;
  total_staff: number;
  total_devices: number;
  active_devices: number;
  new_salons_today: number;
  sessions_today: number;
  plan_free: number;
  plan_standard: number;
  plan_premium: number;
  plan_enterprise: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: { code: string; message: string };
}

// Get Supabase access token
async function getAccessToken(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

// Check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
}

// Sign in with Supabase Auth
export async function signIn(
  email: string,
  password: string
): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

// Sign out
export async function signOut(): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  await supabase.auth.signOut();
}

// API client
async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = await getAccessToken();

  if (!token) {
    return {
      error: {
        code: 'UNAUTHORIZED',
        message: 'Not authenticated',
      },
    };
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  try {
    const response = await fetch(`${ADMIN_API_URL}${path}`, {
      ...options,
      headers,
    });

    const data = await response.json();
    return data;
  } catch (error) {
    return {
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network error',
      },
    };
  }
}

// Get current operator info
export async function getMe(): Promise<ApiResponse<OperatorSession>> {
  return request('/me');
}

// Dashboard
export async function getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
  return request('/dashboard');
}

// Salons
export async function getSalons(params: {
  search?: string;
  status?: string;
  plan?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<{ salons: Salon[]; pagination: Pagination }>> {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set('search', params.search);
  if (params.status) searchParams.set('status', params.status);
  if (params.plan) searchParams.set('plan', params.plan);
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());

  return request(`/salons?${searchParams.toString()}`);
}

export async function getSalon(id: string): Promise<ApiResponse<SalonWithStats>> {
  return request(`/salons/${id}`);
}

export async function updateSalonSeats(
  id: string,
  seats_count: number,
  reason?: string
): Promise<ApiResponse<{ success: boolean; message: string }>> {
  return request(`/salons/${id}/seats`, {
    method: 'PATCH',
    body: JSON.stringify({ seats_count, reason }),
  });
}

export async function updateSalonPlan(
  id: string,
  plan: string,
  reason?: string
): Promise<ApiResponse<{ success: boolean; message: string }>> {
  return request(`/salons/${id}/plan`, {
    method: 'PATCH',
    body: JSON.stringify({ plan, reason }),
  });
}

export async function suspendSalon(
  id: string,
  reason: string,
  internal_note?: string
): Promise<ApiResponse<{ success: boolean; message: string }>> {
  return request(`/salons/${id}/suspend`, {
    method: 'POST',
    body: JSON.stringify({ reason, internal_note }),
  });
}

export async function unsuspendSalon(
  id: string,
  note?: string
): Promise<ApiResponse<{ success: boolean; message: string }>> {
  return request(`/salons/${id}/unsuspend`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}

// Create salon
export async function createSalon(data: {
  name: string;
  plan: 'free' | 'standard' | 'premium' | 'enterprise';
  seats_count: number;
  owner_email?: string;
  owner_name?: string;
}): Promise<ApiResponse<{ salon_id: string; message: string }>> {
  return request('/salons', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Salon usage stats
export interface SalonUsageStats {
  sessions_this_month: number;
  sessions_last_month: number;
  avg_session_duration_min: number;
  avg_session_duration_last_month_min: number;
  avg_talk_score: number;
  avg_talk_score_last_month: number;
  conversion_rate: number;
  conversion_rate_last_month: number;
  weekly_sessions: number[];
  weekly_conversions: number[];
  monthly_history: Array<{
    month: string;
    sessions: number;
    avg_score: number;
    conversions: number;
    conversion_rate: string;
  }>;
}

export async function getSalonUsageStats(salonId: string): Promise<ApiResponse<SalonUsageStats>> {
  return request(`/salons/${salonId}/usage`);
}

// Staff CRUD
export async function createStaff(salonId: string, data: {
  name: string;
  email: string;
  role: string;
  password?: string;
}): Promise<ApiResponse<{ staff_id: string; message: string }>> {
  return request(`/salons/${salonId}/staffs`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateStaff(salonId: string, staffId: string, data: {
  name?: string;
  role?: string;
  is_active?: boolean;
}): Promise<ApiResponse<{ success: boolean; message: string }>> {
  return request(`/salons/${salonId}/staffs/${staffId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteStaff(salonId: string, staffId: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
  return request(`/salons/${salonId}/staffs/${staffId}`, {
    method: 'DELETE',
  });
}

// Device CRUD
export async function createDevice(salonId: string, data: {
  device_name: string;
  seat_number?: number;
}): Promise<ApiResponse<{ device_id: string; activation_code: string; message: string }>> {
  return request(`/salons/${salonId}/devices`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateDevice(salonId: string, deviceId: string, data: {
  device_name?: string;
  seat_number?: number;
  status?: string;
}): Promise<ApiResponse<{ success: boolean; message: string }>> {
  return request(`/salons/${salonId}/devices/${deviceId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteDevice(salonId: string, deviceId: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
  return request(`/salons/${salonId}/devices/${deviceId}`, {
    method: 'DELETE',
  });
}

// Salon expiry
export async function updateSalonExpiry(
  salonId: string,
  expiry_date: string | null,
  reason?: string
): Promise<ApiResponse<{ success: boolean; message: string }>> {
  return request(`/salons/${salonId}/expiry`, {
    method: 'PATCH',
    body: JSON.stringify({ expiry_date, reason }),
  });
}

// Audit logs
export async function getAuditLogs(params: {
  operator_id?: string;
  action?: string;
  target_type?: string;
  target_id?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<{ logs: AuditLog[]; pagination: Pagination }>> {
  const searchParams = new URLSearchParams();
  if (params.operator_id) searchParams.set('operator_id', params.operator_id);
  if (params.action) searchParams.set('action', params.action);
  if (params.target_type) searchParams.set('target_type', params.target_type);
  if (params.target_id) searchParams.set('target_id', params.target_id);
  if (params.from) searchParams.set('from', params.from);
  if (params.to) searchParams.set('to', params.to);
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());

  return request(`/audit-logs?${searchParams.toString()}`);
}
