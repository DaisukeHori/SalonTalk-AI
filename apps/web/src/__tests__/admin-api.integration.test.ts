/**
 * Admin API Integration Tests
 *
 * Tests for the admin-api Edge Function endpoints.
 * Uses MSW for mocking in development, set REAL_API_TEST=true for real API testing.
 *
 * Total Tests: 25+
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import {
  mockOperator,
  mockSalon,
  mockStaff,
  mockDevice,
  mockSession,
  mockAnalytics,
  mockAuditLog,
} from './setup';

// ============================================================
// Test Configuration
// ============================================================

const BASE_URL = process.env.SUPABASE_URL || 'https://njyuuonrjiskzanxbbwf.supabase.co';
const FUNCTIONS_URL = `${BASE_URL}/functions/v1/admin-api`;

// Mock auth token for tests
const TEST_AUTH_TOKEN = 'test-jwt-token-123';

// Helper to make API requests
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data?: T; error?: { code: string; message: string }; status: number }> {
  const response = await fetch(`${FUNCTIONS_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TEST_AUTH_TOKEN}`,
      ...options.headers,
    },
  });

  const json = await response.json();
  return { ...json, status: response.status };
}

// ============================================================
// Test Suites
// ============================================================

describe('Admin API - Authentication', () => {
  // Test 1: Authentication required
  it('should require authorization header', async () => {
    const response = await fetch(`${FUNCTIONS_URL}/me`, {
      headers: { 'Content-Type': 'application/json' },
    });

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error?.code).toBe('UNAUTHORIZED');
  });

  // Test 2: Get current operator info
  it('should return current operator info on /me', async () => {
    const result = await apiRequest('/me');

    expect(result.status).toBe(200);
    expect(result.data).toBeDefined();
    expect(result.data).toHaveProperty('operator_id');
    expect(result.data).toHaveProperty('email');
    expect(result.data).toHaveProperty('name');
    expect(result.data).toHaveProperty('role');
  });
});

describe('Admin API - Dashboard', () => {
  // Test 3: Get dashboard stats
  it('should return dashboard statistics', async () => {
    const result = await apiRequest('/dashboard');

    expect(result.status).toBe(200);
    expect(result.data).toBeDefined();
    expect(result.data).toHaveProperty('total_salons');
    expect(result.data).toHaveProperty('active_salons');
    expect(result.data).toHaveProperty('total_sessions_month');
  });
});

describe('Admin API - Salon Management', () => {
  // Test 4: List salons
  it('should list salons with pagination', async () => {
    const result = await apiRequest('/salons?page=1&limit=10');

    expect(result.status).toBe(200);
    expect(result.data).toHaveProperty('salons');
    expect(result.data).toHaveProperty('pagination');
    expect(Array.isArray(result.data?.salons)).toBe(true);
    expect(result.data?.pagination).toHaveProperty('page');
    expect(result.data?.pagination).toHaveProperty('total');
  });

  // Test 5: Get salon details
  it('should get salon details by ID', async () => {
    const result = await apiRequest(`/salons/${mockSalon.id}`);

    expect(result.status).toBe(200);
    expect(result.data).toHaveProperty('id');
    expect(result.data).toHaveProperty('name');
    expect(result.data).toHaveProperty('stats');
    expect(result.data).toHaveProperty('staffs');
    expect(result.data).toHaveProperty('devices');
  });

  // Test 6: Handle salon not found
  it('should return 404 for non-existent salon', async () => {
    const result = await apiRequest('/salons/not-found');

    expect(result.status).toBe(404);
    expect(result.error?.code).toBe('NOT_FOUND');
  });

  // Test 7: Create salon
  it('should create a new salon', async () => {
    const result = await apiRequest('/salons', {
      method: 'POST',
      body: JSON.stringify({
        name: 'New Test Salon',
        plan: 'standard',
        seats_count: 5,
      }),
    });

    expect(result.status).toBe(201);
    expect(result.data).toHaveProperty('salon_id');
    expect(result.data).toHaveProperty('message');
  });

  // Test 8: Create salon with owner
  it('should create salon with owner info', async () => {
    const result = await apiRequest('/salons', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Salon with Owner',
        plan: 'premium',
        owner_email: 'owner@test.com',
        owner_name: 'Test Owner',
        owner_password: 'securepassword123',
      }),
    });

    expect(result.status).toBe(201);
    expect(result.data?.salon_id).toBeDefined();
  });

  // Test 9: Update salon seats
  it('should update salon seats count', async () => {
    const result = await apiRequest(`/salons/${mockSalon.id}/seats`, {
      method: 'PATCH',
      body: JSON.stringify({
        seats_count: 10,
        reason: 'Business expansion',
      }),
    });

    expect(result.status).toBe(200);
    expect(result.data?.success).toBe(true);
  });

  // Test 10: Validate seats count
  it('should reject invalid seats count', async () => {
    const result = await apiRequest(`/salons/${mockSalon.id}/seats`, {
      method: 'PATCH',
      body: JSON.stringify({
        seats_count: 0,
        reason: 'Invalid',
      }),
    });

    expect(result.status).toBe(400);
    expect(result.error?.code).toBe('INVALID_INPUT');
  });

  // Test 11: Update staff limit
  it('should update salon staff limit', async () => {
    const result = await apiRequest(`/salons/${mockSalon.id}/staff-limit`, {
      method: 'PATCH',
      body: JSON.stringify({
        staff_limit: 20,
        reason: 'Hiring more staff',
      }),
    });

    expect(result.status).toBe(200);
    expect(result.data?.success).toBe(true);
  });

  // Test 12: Update salon plan
  it('should update salon plan', async () => {
    const result = await apiRequest(`/salons/${mockSalon.id}/plan`, {
      method: 'PATCH',
      body: JSON.stringify({
        plan: 'premium',
        reason: 'Upgrade request',
      }),
    });

    expect(result.status).toBe(200);
    expect(result.data?.success).toBe(true);
  });

  // Test 13: Reject invalid plan
  it('should reject invalid plan value', async () => {
    const result = await apiRequest(`/salons/${mockSalon.id}/plan`, {
      method: 'PATCH',
      body: JSON.stringify({
        plan: 'invalid-plan',
        reason: 'Test',
      }),
    });

    expect(result.status).toBe(400);
    expect(result.error?.code).toBe('INVALID_INPUT');
  });

  // Test 14: Suspend salon
  it('should suspend a salon', async () => {
    const result = await apiRequest(`/salons/${mockSalon.id}/suspend`, {
      method: 'POST',
      body: JSON.stringify({
        reason: 'Payment overdue',
        internal_note: 'Contact customer service',
      }),
    });

    expect(result.status).toBe(200);
    expect(result.data?.success).toBe(true);
  });

  // Test 15: Require reason for suspension
  it('should require reason for suspension', async () => {
    const result = await apiRequest(`/salons/${mockSalon.id}/suspend`, {
      method: 'POST',
      body: JSON.stringify({}),
    });

    expect(result.status).toBe(400);
    expect(result.error?.code).toBe('INVALID_INPUT');
  });

  // Test 16: Unsuspend salon
  it('should unsuspend a salon', async () => {
    const result = await apiRequest(`/salons/${mockSalon.id}/unsuspend`, {
      method: 'POST',
      body: JSON.stringify({ note: 'Payment received' }),
    });

    expect(result.status).toBe(200);
    expect(result.data?.success).toBe(true);
  });

  // Test 17: Update salon expiry
  it('should update salon expiry date', async () => {
    const result = await apiRequest(`/salons/${mockSalon.id}/expiry`, {
      method: 'PATCH',
      body: JSON.stringify({
        expiry_date: '2025-12-31',
        reason: 'Contract renewal',
      }),
    });

    expect(result.status).toBe(200);
    expect(result.data?.success).toBe(true);
  });
});

describe('Admin API - Salon Usage Statistics', () => {
  // Test 18: Get salon usage stats
  it('should get salon usage statistics', async () => {
    const result = await apiRequest(`/salons/${mockSalon.id}/usage`);

    expect(result.status).toBe(200);
    expect(result.data).toHaveProperty('sessions_this_month');
    expect(result.data).toHaveProperty('sessions_last_month');
    expect(result.data).toHaveProperty('avg_session_duration_min');
    expect(result.data).toHaveProperty('avg_talk_score');
    expect(result.data).toHaveProperty('conversion_rate');
    expect(result.data).toHaveProperty('weekly_sessions');
  });
});

describe('Admin API - Analytics', () => {
  // Test 19: Get salon analytics with default period
  it('should get salon analytics with default month period', async () => {
    const result = await apiRequest(`/salons/${mockSalon.id}/analytics`);

    expect(result.status).toBe(200);
    expect(result.data).toHaveProperty('period');
    expect(result.data).toHaveProperty('summary');
    expect(result.data?.summary).toHaveProperty('total_sessions');
    expect(result.data?.summary).toHaveProperty('total_transcription_time_min');
    expect(result.data?.summary).toHaveProperty('total_character_count');
  });

  // Test 20: Get analytics with custom date range
  it('should get analytics with custom date range', async () => {
    const result = await apiRequest(
      `/salons/${mockSalon.id}/analytics?period=custom&from_date=2024-01-01&to_date=2024-01-31`
    );

    expect(result.status).toBe(200);
    expect(result.data?.period).toBe('custom');
    expect(result.data).toHaveProperty('from_date');
    expect(result.data).toHaveProperty('to_date');
  });

  // Test 21: Get analytics with staff filter
  it('should get analytics filtered by staff', async () => {
    const result = await apiRequest(
      `/salons/${mockSalon.id}/analytics?staff_id=${mockStaff.id}`
    );

    expect(result.status).toBe(200);
    expect(result.data?.filters?.staff_id).toBe(mockStaff.id);
  });

  // Test 22: Get analytics with device filter
  it('should get analytics filtered by device', async () => {
    const result = await apiRequest(
      `/salons/${mockSalon.id}/analytics?device_id=${mockDevice.id}`
    );

    expect(result.status).toBe(200);
    expect(result.data?.filters?.device_id).toBe(mockDevice.id);
  });

  // Test 23: Analytics should include hourly usage
  it('should include hourly usage in analytics', async () => {
    const result = await apiRequest(`/salons/${mockSalon.id}/analytics`);

    expect(result.status).toBe(200);
    expect(result.data).toHaveProperty('hourly_usage');
    expect(Array.isArray(result.data?.hourly_usage)).toBe(true);
    expect(result.data?.hourly_usage?.length).toBe(24);
  });

  // Test 24: Analytics should include daily trends
  it('should include daily trends in analytics', async () => {
    const result = await apiRequest(`/salons/${mockSalon.id}/analytics`);

    expect(result.status).toBe(200);
    expect(result.data).toHaveProperty('daily_trends');
    expect(Array.isArray(result.data?.daily_trends)).toBe(true);
  });
});

describe('Admin API - Session Management', () => {
  // Test 25: List sessions with pagination
  it('should list sessions with pagination', async () => {
    const result = await apiRequest(`/salons/${mockSalon.id}/sessions?page=1&limit=10`);

    expect(result.status).toBe(200);
    expect(result.data).toHaveProperty('sessions');
    expect(result.data).toHaveProperty('pagination');
    expect(Array.isArray(result.data?.sessions)).toBe(true);
  });

  // Test 26: Filter sessions by date range
  it('should filter sessions by date range', async () => {
    const result = await apiRequest(
      `/salons/${mockSalon.id}/sessions?from_date=2024-01-01&to_date=2024-01-31`
    );

    expect(result.status).toBe(200);
    expect(Array.isArray(result.data?.sessions)).toBe(true);
  });

  // Test 27: Filter sessions by staff
  it('should filter sessions by staff', async () => {
    const result = await apiRequest(
      `/salons/${mockSalon.id}/sessions?staff_id=${mockStaff.id}`
    );

    expect(result.status).toBe(200);
    expect(Array.isArray(result.data?.sessions)).toBe(true);
  });

  // Test 28: Get session detail with transcription
  it('should get session detail with transcription', async () => {
    const result = await apiRequest(
      `/salons/${mockSalon.id}/sessions/${mockSession.id}`
    );

    expect(result.status).toBe(200);
    expect(result.data).toHaveProperty('session');
    expect(result.data).toHaveProperty('transcription');
    expect(result.data?.transcription).toHaveProperty('segments');
    expect(result.data?.transcription).toHaveProperty('stats');
  });

  // Test 29: Session transcription stats
  it('should include transcription stats in session detail', async () => {
    const result = await apiRequest(
      `/salons/${mockSalon.id}/sessions/${mockSession.id}`
    );

    expect(result.status).toBe(200);
    const stats = result.data?.transcription?.stats;
    expect(stats).toHaveProperty('total_segments');
    expect(stats).toHaveProperty('total_characters');
    expect(stats).toHaveProperty('stylist_characters');
    expect(stats).toHaveProperty('customer_characters');
    expect(stats).toHaveProperty('talk_ratio');
  });

  // Test 30: Handle session not found
  it('should return 404 for non-existent session', async () => {
    const result = await apiRequest(
      `/salons/${mockSalon.id}/sessions/not-found`
    );

    expect(result.status).toBe(404);
    expect(result.error?.code).toBe('NOT_FOUND');
  });
});

describe('Admin API - Staff Management', () => {
  // Test 31: Create staff
  it('should create a new staff member', async () => {
    const result = await apiRequest(`/salons/${mockSalon.id}/staffs`, {
      method: 'POST',
      body: JSON.stringify({
        name: 'New Stylist',
        email: 'newstylist@test.com',
        role: 'stylist',
      }),
    });

    expect(result.status).toBe(201);
    expect(result.data).toHaveProperty('staff_id');
  });

  // Test 32: Require name and email for staff
  it('should require name and email for staff creation', async () => {
    const result = await apiRequest(`/salons/${mockSalon.id}/staffs`, {
      method: 'POST',
      body: JSON.stringify({ role: 'stylist' }),
    });

    expect(result.status).toBe(400);
    expect(result.error?.code).toBe('INVALID_INPUT');
  });

  // Test 33: Update staff
  it('should update staff information', async () => {
    const result = await apiRequest(
      `/salons/${mockSalon.id}/staffs/${mockStaff.id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          name: 'Updated Name',
          role: 'manager',
        }),
      }
    );

    expect(result.status).toBe(200);
    expect(result.data?.success).toBe(true);
  });

  // Test 34: Delete staff
  it('should delete a staff member', async () => {
    const result = await apiRequest(
      `/salons/${mockSalon.id}/staffs/${mockStaff.id}`,
      { method: 'DELETE' }
    );

    expect(result.status).toBe(200);
    expect(result.data?.success).toBe(true);
  });
});

describe('Admin API - Device Management', () => {
  // Test 35: Create device
  it('should create a new device', async () => {
    const result = await apiRequest(`/salons/${mockSalon.id}/devices`, {
      method: 'POST',
      body: JSON.stringify({
        device_name: 'New iPad',
        seat_number: 2,
      }),
    });

    expect(result.status).toBe(201);
    expect(result.data).toHaveProperty('device_id');
  });

  // Test 36: Require device name
  it('should require device name for creation', async () => {
    const result = await apiRequest(`/salons/${mockSalon.id}/devices`, {
      method: 'POST',
      body: JSON.stringify({ seat_number: 1 }),
    });

    expect(result.status).toBe(400);
    expect(result.error?.code).toBe('INVALID_INPUT');
  });

  // Test 37: Update device
  it('should update device information', async () => {
    const result = await apiRequest(
      `/salons/${mockSalon.id}/devices/${mockDevice.id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          device_name: 'Updated iPad',
          seat_number: 3,
          status: 'inactive',
        }),
      }
    );

    expect(result.status).toBe(200);
    expect(result.data?.success).toBe(true);
  });

  // Test 38: Delete device
  it('should delete a device', async () => {
    const result = await apiRequest(
      `/salons/${mockSalon.id}/devices/${mockDevice.id}`,
      { method: 'DELETE' }
    );

    expect(result.status).toBe(200);
    expect(result.data?.success).toBe(true);
  });
});

describe('Admin API - Audit Logs', () => {
  // Test 39: List audit logs
  it('should list audit logs with pagination', async () => {
    const result = await apiRequest('/audit-logs?page=1&limit=50');

    expect(result.status).toBe(200);
    expect(result.data).toHaveProperty('logs');
    expect(result.data).toHaveProperty('pagination');
    expect(Array.isArray(result.data?.logs)).toBe(true);
  });

  // Test 40: Filter audit logs by action
  it('should filter audit logs by action', async () => {
    const result = await apiRequest('/audit-logs?action=salon.create');

    expect(result.status).toBe(200);
    expect(Array.isArray(result.data?.logs)).toBe(true);
  });

  // Test 41: Filter audit logs by target type
  it('should filter audit logs by target type', async () => {
    const result = await apiRequest('/audit-logs?target_type=salon');

    expect(result.status).toBe(200);
    expect(Array.isArray(result.data?.logs)).toBe(true);
  });

  // Test 42: Filter audit logs by date range
  it('should filter audit logs by date range', async () => {
    const result = await apiRequest(
      '/audit-logs?from=2024-01-01&to=2024-12-31'
    );

    expect(result.status).toBe(200);
    expect(Array.isArray(result.data?.logs)).toBe(true);
  });
});

describe('Admin API - Operator Management', () => {
  // Test 43: List operators
  it('should list all operators', async () => {
    const result = await apiRequest('/operators');

    expect(result.status).toBe(200);
    expect(Array.isArray(result.data)).toBe(true);
  });

  // Test 44: Create operator
  it('should create a new operator', async () => {
    const result = await apiRequest('/operators', {
      method: 'POST',
      body: JSON.stringify({
        email: 'newoperator@test.com',
        password: 'securepass123',
        name: 'New Operator',
        role: 'operator_support',
      }),
    });

    expect(result.status).toBe(201);
    expect(result.data).toHaveProperty('id');
    expect(result.data).toHaveProperty('email');
    expect(result.data).toHaveProperty('name');
    expect(result.data).toHaveProperty('role');
  });

  // Test 45: Require all fields for operator creation
  it('should require email, password, and name for operator creation', async () => {
    const result = await apiRequest('/operators', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@test.com' }),
    });

    expect(result.status).toBe(400);
    expect(result.error?.code).toBe('INVALID_INPUT');
  });

  // Test 46: Enforce password length
  it('should enforce minimum password length', async () => {
    const result = await apiRequest('/operators', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@test.com',
        password: '123',
        name: 'Test',
      }),
    });

    expect(result.status).toBe(400);
    expect(result.error?.message).toContain('8 characters');
  });

  // Test 47: Update operator
  it('should update operator information', async () => {
    const result = await apiRequest('/operators/other-operator-123', {
      method: 'PATCH',
      body: JSON.stringify({
        name: 'Updated Name',
        role: 'operator_admin',
      }),
    });

    expect(result.status).toBe(200);
    expect(result.data).toHaveProperty('id');
  });

  // Test 48: Prevent self-deactivation
  it('should prevent operator from deactivating themselves', async () => {
    const result = await apiRequest(`/operators/${mockOperator.operator_id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: false }),
    });

    expect(result.status).toBe(403);
    expect(result.error?.code).toBe('FORBIDDEN');
  });
});

describe('Admin API - Error Handling', () => {
  // Test 49: Handle unknown endpoint
  it('should return 404 for unknown endpoints', async () => {
    const result = await apiRequest('/unknown-endpoint');

    expect(result.status).toBe(404);
    expect(result.error?.code).toBe('NOT_FOUND');
  });

  // Test 50: Handle CORS preflight
  it('should handle CORS preflight requests', async () => {
    const response = await fetch(`${FUNCTIONS_URL}/me`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET',
      },
    });

    expect(response.status).toBe(200);
  });
});
