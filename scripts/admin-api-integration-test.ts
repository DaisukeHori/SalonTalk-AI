/**
 * Admin API 結合テスト
 * 20種類のAPIエンドポイントをテストします
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://njyuuonrjiskzanxbbwf.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ADMIN_API_URL = `${SUPABASE_URL}/functions/v1/admin-api`;

// Test results tracking
let passed = 0;
let failed = 0;
const results: Array<{ test: string; status: 'PASS' | 'FAIL'; message?: string }> = [];

// Get admin token
async function getAdminToken(): Promise<string> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Get or create admin user
  const { data: authUser, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'admin@salontalk.jp',
    password: 'Admin123!@#'
  });

  if (signInError || !authUser.session) {
    throw new Error(`Failed to sign in as admin: ${signInError?.message}`);
  }

  return authUser.session.access_token;
}

// Helper function to make API requests
async function apiRequest(
  path: string,
  method: string = 'GET',
  body?: Record<string, unknown>,
  token?: string
): Promise<{ status: number; data: unknown }> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${ADMIN_API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();
  return { status: response.status, data };
}

// Test function wrapper
async function runTest(
  testName: string,
  testFn: () => Promise<void>
): Promise<void> {
  try {
    await testFn();
    passed++;
    results.push({ test: testName, status: 'PASS' });
    console.log(`✅ ${testName}`);
  } catch (error) {
    failed++;
    const message = error instanceof Error ? error.message : String(error);
    results.push({ test: testName, status: 'FAIL', message });
    console.log(`❌ ${testName}: ${message}`);
  }
}

// Assertion helper
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

// Main test suite
async function runTests() {
  console.log('🧪 Admin API 結合テスト開始\n');
  console.log('='.repeat(60));

  let token: string;
  let testSalonId: string;
  let testStaffId: string;
  let testDeviceId: string;

  // 1. 認証テスト（トークンなし）
  await runTest('1. 認証エラー - トークンなしでAPIアクセス', async () => {
    const { status, data } = await apiRequest('/me');
    assert(status === 401 || (data as { error?: { code: string } }).error?.code === 'UNAUTHORIZED',
      'Should return unauthorized without token');
  });

  // 2. 認証テスト（有効なトークン取得）
  await runTest('2. 認証成功 - 管理者トークン取得', async () => {
    token = await getAdminToken();
    assert(!!token, 'Token should be obtained');
  });

  // 3. /me エンドポイント
  await runTest('3. GET /me - 現在の管理者情報取得', async () => {
    const { status, data } = await apiRequest('/me', 'GET', undefined, token);
    const response = data as { data?: { email: string } };
    assert(status === 200, `Expected 200, got ${status}`);
    assert(!!response.data?.email, 'Should return operator email');
  });

  // 4. /dashboard エンドポイント
  await runTest('4. GET /dashboard - ダッシュボード統計取得', async () => {
    const { status, data } = await apiRequest('/dashboard', 'GET', undefined, token);
    const response = data as { data?: { total_salons: number } };
    assert(status === 200, `Expected 200, got ${status}`);
    assert(typeof response.data?.total_salons === 'number', 'Should return total_salons');
  });

  // 5. /salons 一覧取得
  await runTest('5. GET /salons - サロン一覧取得', async () => {
    const { status, data } = await apiRequest('/salons', 'GET', undefined, token);
    const response = data as { data?: { salons: unknown[] } };
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(response.data?.salons), 'Should return salons array');
  });

  // 6. /salons フィルタリング
  await runTest('6. GET /salons?status=active - ステータスフィルタ', async () => {
    const { status, data } = await apiRequest('/salons?status=active', 'GET', undefined, token);
    const response = data as { data?: { salons: unknown[] } };
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(response.data?.salons), 'Should return filtered salons');
  });

  // 7. /salons 検索
  await runTest('7. GET /salons?search=test - 検索機能', async () => {
    const { status, data } = await apiRequest('/salons?search=test', 'GET', undefined, token);
    const response = data as { data?: { salons: unknown[] } };
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(response.data?.salons), 'Should return search results');
  });

  // 8. POST /salons - サロン作成
  await runTest('8. POST /salons - 新規サロン作成', async () => {
    const { status, data } = await apiRequest('/salons', 'POST', {
      name: `Test Salon ${Date.now()}`,
      plan: 'standard',
      seats_count: 5
    }, token);
    const response = data as { data?: { salon_id: string } };
    assert(status === 200 || status === 201, `Expected 200/201, got ${status}`);
    assert(!!response.data?.salon_id, 'Should return salon_id');
    testSalonId = response.data!.salon_id;
  });

  // 9. GET /salons/:id - サロン詳細取得
  await runTest('9. GET /salons/:id - サロン詳細取得', async () => {
    assert(!!testSalonId, 'Test salon ID required');
    const { status, data } = await apiRequest(`/salons/${testSalonId}`, 'GET', undefined, token);
    const response = data as { data?: { id: string; stats?: unknown } };
    assert(status === 200, `Expected 200, got ${status}`);
    assert(response.data?.id === testSalonId, 'Should return correct salon');
    assert(!!response.data?.stats, 'Should include stats');
  });

  // 10. PATCH /salons/:id/seats - 席数更新
  await runTest('10. PATCH /salons/:id/seats - 席数更新', async () => {
    assert(!!testSalonId, 'Test salon ID required');
    const { status, data } = await apiRequest(`/salons/${testSalonId}/seats`, 'PATCH', {
      seats_count: 10,
      reason: 'Integration test'
    }, token);
    const response = data as { data?: { success: boolean } };
    assert(status === 200, `Expected 200, got ${status}`);
    assert(response.data?.success === true, 'Should return success');
  });

  // 11. PATCH /salons/:id/plan - プラン更新
  await runTest('11. PATCH /salons/:id/plan - プラン更新', async () => {
    assert(!!testSalonId, 'Test salon ID required');
    const { status, data } = await apiRequest(`/salons/${testSalonId}/plan`, 'PATCH', {
      plan: 'premium',
      reason: 'Integration test'
    }, token);
    const response = data as { data?: { success: boolean } };
    assert(status === 200, `Expected 200, got ${status}`);
    assert(response.data?.success === true, 'Should return success');
  });

  // 12. PATCH /salons/:id/expiry - 有効期限設定
  await runTest('12. PATCH /salons/:id/expiry - 有効期限設定', async () => {
    assert(!!testSalonId, 'Test salon ID required');
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    const { status, data } = await apiRequest(`/salons/${testSalonId}/expiry`, 'PATCH', {
      expiry_date: expiryDate.toISOString().split('T')[0],
      reason: 'Integration test'
    }, token);
    const response = data as { data?: { success: boolean } };
    assert(status === 200, `Expected 200, got ${status}`);
    assert(response.data?.success === true, 'Should return success');
  });

  // 13. GET /salons/:id/usage - 利用統計取得
  await runTest('13. GET /salons/:id/usage - 利用統計取得', async () => {
    assert(!!testSalonId, 'Test salon ID required');
    const { status, data } = await apiRequest(`/salons/${testSalonId}/usage`, 'GET', undefined, token);
    const response = data as { data?: { sessions_this_month: number } };
    assert(status === 200, `Expected 200, got ${status}`);
    assert(typeof response.data?.sessions_this_month === 'number', 'Should return sessions_this_month');
  });

  // 14. POST /salons/:id/staffs - スタッフ作成
  await runTest('14. POST /salons/:id/staffs - スタッフ作成', async () => {
    assert(!!testSalonId, 'Test salon ID required');
    const { status, data } = await apiRequest(`/salons/${testSalonId}/staffs`, 'POST', {
      name: `Test Staff ${Date.now()}`,
      email: `teststaff${Date.now()}@example.com`,
      role: 'stylist'
    }, token);
    const response = data as { data?: { staff_id: string } };
    assert(status === 200 || status === 201, `Expected 200/201, got ${status}`);
    assert(!!response.data?.staff_id, 'Should return staff_id');
    testStaffId = response.data!.staff_id;
  });

  // 15. PATCH /salons/:id/staffs/:staffId - スタッフ更新
  await runTest('15. PATCH /salons/:id/staffs/:staffId - スタッフ更新', async () => {
    assert(!!testSalonId && !!testStaffId, 'Test salon and staff IDs required');
    const { status, data } = await apiRequest(`/salons/${testSalonId}/staffs/${testStaffId}`, 'PATCH', {
      name: 'Updated Staff Name',
      role: 'manager'
    }, token);
    const response = data as { data?: { success: boolean } };
    assert(status === 200, `Expected 200, got ${status}`);
    assert(response.data?.success === true, 'Should return success');
  });

  // 16. POST /salons/:id/devices - デバイス作成
  await runTest('16. POST /salons/:id/devices - デバイス作成', async () => {
    assert(!!testSalonId, 'Test salon ID required');
    const { status, data } = await apiRequest(`/salons/${testSalonId}/devices`, 'POST', {
      device_name: `Test Device ${Date.now()}`,
      seat_number: 1
    }, token);
    const response = data as { data?: { device_id: string; activation_code: string } };
    assert(status === 200 || status === 201, `Expected 200/201, got ${status}`);
    assert(!!response.data?.device_id, 'Should return device_id');
    assert(!!response.data?.activation_code, 'Should return activation_code');
    testDeviceId = response.data!.device_id;
  });

  // 17. PATCH /salons/:id/devices/:deviceId - デバイス更新
  await runTest('17. PATCH /salons/:id/devices/:deviceId - デバイス更新', async () => {
    assert(!!testSalonId && !!testDeviceId, 'Test salon and device IDs required');
    const { status, data } = await apiRequest(`/salons/${testSalonId}/devices/${testDeviceId}`, 'PATCH', {
      device_name: 'Updated Device Name',
      seat_number: 2
    }, token);
    const response = data as { data?: { success: boolean } };
    assert(status === 200, `Expected 200, got ${status}`);
    assert(response.data?.success === true, 'Should return success');
  });

  // 18. POST /salons/:id/suspend - サロン停止
  await runTest('18. POST /salons/:id/suspend - サロン停止', async () => {
    assert(!!testSalonId, 'Test salon ID required');
    const { status, data } = await apiRequest(`/salons/${testSalonId}/suspend`, 'POST', {
      reason: 'Integration test suspension',
      internal_note: 'Test note'
    }, token);
    const response = data as { data?: { success: boolean } };
    assert(status === 200, `Expected 200, got ${status}`);
    assert(response.data?.success === true, 'Should return success');
  });

  // 19. POST /salons/:id/unsuspend - サロン再開
  await runTest('19. POST /salons/:id/unsuspend - サロン再開', async () => {
    assert(!!testSalonId, 'Test salon ID required');
    const { status, data } = await apiRequest(`/salons/${testSalonId}/unsuspend`, 'POST', {
      note: 'Integration test unsuspension'
    }, token);
    const response = data as { data?: { success: boolean } };
    assert(status === 200, `Expected 200, got ${status}`);
    assert(response.data?.success === true, 'Should return success');
  });

  // 20. GET /audit-logs - 監査ログ取得
  await runTest('20. GET /audit-logs - 監査ログ取得', async () => {
    const { status, data } = await apiRequest('/audit-logs', 'GET', undefined, token);
    const response = data as { data?: { logs: unknown[] } };
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(response.data?.logs), 'Should return logs array');
  });

  // Cleanup - Delete test resources
  console.log('\n🧹 クリーンアップ中...');

  if (testDeviceId && testSalonId) {
    try {
      await apiRequest(`/salons/${testSalonId}/devices/${testDeviceId}`, 'DELETE', undefined, token);
      console.log('  - テストデバイス削除完了');
    } catch (e) {
      console.log('  - テストデバイス削除スキップ');
    }
  }

  if (testStaffId && testSalonId) {
    try {
      await apiRequest(`/salons/${testSalonId}/staffs/${testStaffId}`, 'DELETE', undefined, token);
      console.log('  - テストスタッフ削除完了');
    } catch (e) {
      console.log('  - テストスタッフ削除スキップ');
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 テスト結果サマリー');
  console.log('='.repeat(60));
  console.log(`✅ 成功: ${passed} / ${passed + failed}`);
  console.log(`❌ 失敗: ${failed} / ${passed + failed}`);
  console.log('='.repeat(60));

  if (failed > 0) {
    console.log('\n❌ 失敗したテスト:');
    results
      .filter(r => r.status === 'FAIL')
      .forEach(r => console.log(`  - ${r.test}: ${r.message}`));
  }

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
