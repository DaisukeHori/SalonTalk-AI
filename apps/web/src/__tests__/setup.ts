/**
 * Test Setup - Configuration for Vitest integration tests
 *
 * Uses MSW (Mock Service Worker) for API mocking in integration tests.
 * For real API testing, set REAL_API_TEST=true environment variable.
 */

import { beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// ============================================================
// Mock Data
// ============================================================

export const mockOperator = {
  operator_id: 'test-operator-123',
  email: 'admin@salontalk.jp',
  name: 'Test Operator',
  role: 'operator_admin' as const,
};

export const mockSupportOperator = {
  operator_id: 'test-operator-support',
  email: 'support@salontalk.jp',
  name: 'Test Support',
  role: 'operator_support' as const,
};

export const mockSalon = {
  id: 'test-salon-123',
  name: 'Test Salon',
  plan: 'standard',
  status: 'active',
  seats_count: 5,
  staff_limit: 10,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

export const mockStaff = {
  id: 'test-staff-123',
  salon_id: 'test-salon-123',
  name: 'Test Stylist',
  email: 'stylist@test.com',
  role: 'stylist',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
};

export const mockDevice = {
  id: 'test-device-123',
  salon_id: 'test-salon-123',
  device_name: 'iPad Pro 1',
  seat_number: 1,
  status: 'active',
  last_active_at: '2024-01-01T00:00:00Z',
};

export const mockSession = {
  id: 'test-session-123',
  salon_id: 'test-salon-123',
  stylist_id: 'test-staff-123',
  device_id: 'test-device-123',
  status: 'completed',
  started_at: '2024-01-01T09:00:00Z',
  ended_at: '2024-01-01T09:30:00Z',
  total_duration_ms: 1800000,
  customer_info: { age_group: '30s', gender: 'female' },
};

export const mockAnalytics = {
  period: 'month',
  from_date: '2024-01-01T00:00:00Z',
  to_date: '2024-01-31T23:59:59Z',
  filters: { staff_id: null, device_id: null },
  summary: {
    total_sessions: 100,
    total_transcription_time_min: 5000,
    total_character_count: 500000,
    total_segments: 2000,
    stylist_character_count: 200000,
    customer_character_count: 300000,
    avg_session_duration_min: 50,
    avg_characters_per_session: 5000,
  },
  staff_stats: [],
  device_stats: [],
  hourly_usage: Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    session_count: i >= 9 && i <= 18 ? Math.floor(Math.random() * 10) : 0,
    total_duration_min: i >= 9 && i <= 18 ? Math.floor(Math.random() * 100) : 0,
  })),
  daily_trends: Array.from({ length: 30 }, (_, i) => ({
    date: `2024-01-${String(i + 1).padStart(2, '0')}`,
    session_count: Math.floor(Math.random() * 20),
    total_duration_min: Math.floor(Math.random() * 500),
    total_characters: Math.floor(Math.random() * 50000),
  })),
};

export const mockAuditLog = {
  id: 'test-audit-123',
  operator_id: 'test-operator-123',
  action: 'salon.create',
  target_type: 'salon',
  target_id: 'test-salon-123',
  target_name: 'Test Salon',
  details: { plan: 'standard' },
  ip_address: '127.0.0.1',
  user_agent: 'Test Agent',
  created_at: '2024-01-01T00:00:00Z',
  operator: { id: 'test-operator-123', email: 'admin@salontalk.jp', name: 'Test Operator' },
};

// ============================================================
// MSW Handlers
// ============================================================

const BASE_URL = process.env.SUPABASE_URL || 'https://njyuuonrjiskzanxbbwf.supabase.co';
const FUNCTIONS_URL = `${BASE_URL}/functions/v1/admin-api`;

export const handlers = [
  // Handle OPTIONS (CORS preflight)
  http.options(`${FUNCTIONS_URL}/*`, () => {
    return new HttpResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }),

  // Handle unauthorized requests (no Authorization header) - MUST be before other handlers
  http.all(`${FUNCTIONS_URL}/*`, ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authorization required' } },
        { status: 401 }
      );
    }
    // If authorized, let other handlers process the request
    return undefined;
  }),

  // GET /me
  http.get(`${FUNCTIONS_URL}/me`, () => {
    return HttpResponse.json({ data: mockOperator });
  }),

  // GET /dashboard
  http.get(`${FUNCTIONS_URL}/dashboard`, () => {
    return HttpResponse.json({
      data: {
        total_salons: 10,
        active_salons: 8,
        suspended_salons: 2,
        total_sessions_month: 500,
        total_staffs: 50,
        total_devices: 30,
      },
    });
  }),

  // GET /salons
  http.get(`${FUNCTIONS_URL}/salons`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    return HttpResponse.json({
      data: {
        salons: [mockSalon],
        pagination: { page, limit, total: 1, total_pages: 1 },
      },
    });
  }),

  // POST /salons
  http.post(`${FUNCTIONS_URL}/salons`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(
      {
        data: {
          salon_id: 'new-salon-123',
          message: 'Salon created successfully',
        },
      },
      { status: 201 }
    );
  }),

  // GET /salons/:id
  http.get(`${FUNCTIONS_URL}/salons/:id`, ({ params }) => {
    if (params.id === 'not-found') {
      return HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'Salon not found' } }, { status: 404 });
    }
    return HttpResponse.json({
      data: {
        ...mockSalon,
        id: params.id,
        stats: { sessions_count: 100, avg_score: 75 },
        staffs: [mockStaff],
        devices: [mockDevice],
      },
    });
  }),

  // PATCH /salons/:id/seats
  http.patch(`${FUNCTIONS_URL}/salons/:id/seats`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.seats_count !== 'number' || body.seats_count < 1 || body.seats_count > 100) {
      return HttpResponse.json({ error: { code: 'INVALID_INPUT', message: 'seats_count must be between 1 and 100' } }, { status: 400 });
    }
    return HttpResponse.json({ data: { success: true, message: 'Seats count updated successfully' } });
  }),

  // PATCH /salons/:id/staff-limit
  http.patch(`${FUNCTIONS_URL}/salons/:id/staff-limit`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.staff_limit !== 'number' || body.staff_limit < 1 || body.staff_limit > 1000) {
      return HttpResponse.json({ error: { code: 'INVALID_INPUT', message: 'staff_limit must be between 1 and 1000' } }, { status: 400 });
    }
    return HttpResponse.json({ data: { success: true, message: 'Staff limit updated successfully' } });
  }),

  // PATCH /salons/:id/plan
  http.patch(`${FUNCTIONS_URL}/salons/:id/plan`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const validPlans = ['free', 'standard', 'premium', 'enterprise'];
    if (!validPlans.includes(body.plan as string)) {
      return HttpResponse.json({ error: { code: 'INVALID_INPUT', message: 'Invalid plan' } }, { status: 400 });
    }
    return HttpResponse.json({ data: { success: true, message: 'Plan updated successfully' } });
  }),

  // POST /salons/:id/suspend
  http.post(`${FUNCTIONS_URL}/salons/:id/suspend`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    if (!body.reason) {
      return HttpResponse.json({ error: { code: 'INVALID_INPUT', message: 'Reason is required' } }, { status: 400 });
    }
    return HttpResponse.json({ data: { success: true, message: 'Salon suspended successfully' } });
  }),

  // POST /salons/:id/unsuspend
  http.post(`${FUNCTIONS_URL}/salons/:id/unsuspend`, () => {
    return HttpResponse.json({ data: { success: true, message: 'Salon unsuspended successfully' } });
  }),

  // GET /salons/:id/usage
  http.get(`${FUNCTIONS_URL}/salons/:id/usage`, () => {
    return HttpResponse.json({
      data: {
        sessions_this_month: 100,
        sessions_last_month: 80,
        avg_session_duration_min: 30,
        avg_session_duration_last_month_min: 28,
        avg_talk_score: 75,
        avg_talk_score_last_month: 72,
        conversion_rate: 25,
        conversion_rate_last_month: 22,
        weekly_sessions: [10, 12, 8, 15, 14, 11, 9],
        weekly_conversions: [2, 3, 2, 4, 3, 3, 2],
        monthly_history: [],
      },
    });
  }),

  // GET /salons/:id/analytics
  http.get(`${FUNCTIONS_URL}/salons/:id/analytics`, ({ request }) => {
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'month';
    const staffId = url.searchParams.get('staff_id');
    const deviceId = url.searchParams.get('device_id');

    return HttpResponse.json({
      data: {
        ...mockAnalytics,
        period,
        filters: { staff_id: staffId, device_id: deviceId },
      },
    });
  }),

  // GET /salons/:id/sessions
  http.get(`${FUNCTIONS_URL}/salons/:id/sessions`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    return HttpResponse.json({
      data: {
        sessions: [
          {
            ...mockSession,
            staffs: { id: mockStaff.id, name: mockStaff.name },
            devices: { id: mockDevice.id, device_name: mockDevice.device_name, seat_number: mockDevice.seat_number },
            session_reports: { overall_score: 75, summary: 'Good conversation' },
          },
        ],
        pagination: { page, limit, total: 1, total_pages: 1 },
      },
    });
  }),

  // GET /salons/:id/sessions/:sessionId
  http.get(`${FUNCTIONS_URL}/salons/:salonId/sessions/:sessionId`, ({ params }) => {
    if (params.sessionId === 'not-found') {
      return HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'Session not found' } }, { status: 404 });
    }
    return HttpResponse.json({
      data: {
        session: {
          ...mockSession,
          staffs: { id: mockStaff.id, name: mockStaff.name, email: mockStaff.email },
          devices: { id: mockDevice.id, device_name: mockDevice.device_name, seat_number: mockDevice.seat_number },
          session_reports: [{ overall_score: 75, summary: 'Good conversation', strengths: [], improvements: [] }],
          session_analyses: [],
        },
        transcription: {
          segments: [
            { id: 'seg-1', speaker: 'stylist', text: 'Hello', start_time_ms: 0, end_time_ms: 1000, confidence: 0.95, chunk_index: 0 },
            { id: 'seg-2', speaker: 'customer', text: 'Hi there', start_time_ms: 1000, end_time_ms: 2000, confidence: 0.92, chunk_index: 0 },
          ],
          stats: {
            total_segments: 2,
            total_characters: 13,
            stylist_characters: 5,
            customer_characters: 8,
            talk_ratio: { stylist: 38, customer: 62 },
          },
        },
      },
    });
  }),

  // POST /salons/:id/staffs
  http.post(`${FUNCTIONS_URL}/salons/:id/staffs`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    if (!body.name || !body.email) {
      return HttpResponse.json({ error: { code: 'INVALID_INPUT', message: 'Name and email are required' } }, { status: 400 });
    }
    return HttpResponse.json({ data: { staff_id: 'new-staff-123', message: 'Staff created successfully' } }, { status: 201 });
  }),

  // PATCH /salons/:id/staffs/:staffId
  http.patch(`${FUNCTIONS_URL}/salons/:salonId/staffs/:staffId`, () => {
    return HttpResponse.json({ data: { success: true, message: 'Staff updated successfully' } });
  }),

  // DELETE /salons/:id/staffs/:staffId
  http.delete(`${FUNCTIONS_URL}/salons/:salonId/staffs/:staffId`, () => {
    return HttpResponse.json({ data: { success: true, message: 'Staff deleted successfully' } });
  }),

  // POST /salons/:id/devices
  http.post(`${FUNCTIONS_URL}/salons/:id/devices`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    if (!body.device_name) {
      return HttpResponse.json({ error: { code: 'INVALID_INPUT', message: 'Device name is required' } }, { status: 400 });
    }
    return HttpResponse.json({ data: { device_id: 'new-device-123', activation_code: '123456', message: 'Device created successfully' } }, { status: 201 });
  }),

  // PATCH /salons/:id/devices/:deviceId
  http.patch(`${FUNCTIONS_URL}/salons/:salonId/devices/:deviceId`, () => {
    return HttpResponse.json({ data: { success: true, message: 'Device updated successfully' } });
  }),

  // DELETE /salons/:id/devices/:deviceId
  http.delete(`${FUNCTIONS_URL}/salons/:salonId/devices/:deviceId`, () => {
    return HttpResponse.json({ data: { success: true, message: 'Device deleted successfully' } });
  }),

  // PATCH /salons/:id/expiry
  http.patch(`${FUNCTIONS_URL}/salons/:id/expiry`, () => {
    return HttpResponse.json({ data: { success: true, message: 'Expiry date updated successfully' } });
  }),

  // GET /audit-logs
  http.get(`${FUNCTIONS_URL}/audit-logs`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    return HttpResponse.json({
      data: {
        logs: [mockAuditLog],
        pagination: { page, limit, total: 1, total_pages: 1 },
      },
    });
  }),

  // GET /operators
  http.get(`${FUNCTIONS_URL}/operators`, () => {
    return HttpResponse.json({
      data: [
        { ...mockOperator, operator_id: undefined, id: mockOperator.operator_id, is_active: true, last_login_at: '2024-01-01T00:00:00Z', created_at: '2024-01-01T00:00:00Z' },
      ],
    });
  }),

  // POST /operators
  http.post(`${FUNCTIONS_URL}/operators`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    if (!body.email || !body.password || !body.name) {
      return HttpResponse.json({ error: { code: 'INVALID_INPUT', message: 'Email, password, and name are required' } }, { status: 400 });
    }
    if (typeof body.password === 'string' && body.password.length < 8) {
      return HttpResponse.json({ error: { code: 'INVALID_INPUT', message: 'Password must be at least 8 characters' } }, { status: 400 });
    }
    return HttpResponse.json(
      {
        data: {
          id: 'new-operator-123',
          email: body.email,
          name: body.name,
          role: body.role || 'operator_support',
          created_at: new Date().toISOString(),
        },
      },
      { status: 201 }
    );
  }),

  // PATCH /operators/:id
  http.patch(`${FUNCTIONS_URL}/operators/:id`, async ({ request, params }) => {
    const body = (await request.json()) as Record<string, unknown>;

    // Check self-deactivation
    if (params.id === mockOperator.operator_id && body.is_active === false) {
      return HttpResponse.json({ error: { code: 'FORBIDDEN', message: 'Cannot deactivate your own account' } }, { status: 403 });
    }

    return HttpResponse.json({
      data: {
        id: params.id,
        email: 'updated@test.com',
        name: body.name || 'Updated Operator',
        role: body.role || 'operator_support',
        is_active: body.is_active ?? true,
        created_at: '2024-01-01T00:00:00Z',
      },
    });
  }),

  // Catch-all for unknown endpoints - must be last
  http.all(`${FUNCTIONS_URL}/*`, ({ request }) => {
    // Skip if no auth header (will be caught by auth handler)
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Endpoint not found' } },
        { status: 404 }
      );
    }
    return undefined;
  }),
];

// ============================================================
// Server Setup
// ============================================================

export const server = setupServer(...handlers);

beforeAll(() => {
  // Check if we should skip mocking for real API tests
  if (process.env.REAL_API_TEST === 'true') {
    console.log('Running real API tests - MSW disabled');
    return;
  }
  server.listen({ onUnhandledRequest: 'bypass' });
});

afterEach(() => {
  if (process.env.REAL_API_TEST !== 'true') {
    server.resetHandlers();
  }
});

afterAll(() => {
  if (process.env.REAL_API_TEST !== 'true') {
    server.close();
  }
});
