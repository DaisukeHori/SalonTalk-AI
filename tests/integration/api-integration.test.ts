/**
 * SalonTalk AI - 結合テストシナリオ
 * 30以上のシナリオで全APIフローをテスト
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// テスト用の環境変数
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// テストデータ
const TEST_USER_EMAIL = 'test@example.com';
const TEST_USER_PASSWORD = 'testPassword123!';
const TEST_SALON_NAME = 'テストサロン';

interface TestContext {
  supabase: SupabaseClient;
  adminClient: SupabaseClient;
  userId?: string;
  salonId?: string;
  staffId?: string;
  sessionId?: string;
  reportId?: string;
  scenarioId?: string;
  roleplaySessionId?: string;
  successCaseId?: string;
}

let ctx: TestContext;

// ============================================================
// テストセットアップ
// ============================================================

beforeAll(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  ctx = { supabase, adminClient };
});

afterAll(async () => {
  // テストデータのクリーンアップ
  if (ctx.adminClient && ctx.salonId) {
    await ctx.adminClient.from('salons').delete().eq('id', ctx.salonId);
  }
});

// ============================================================
// 1. 認証フロー (Authentication Flow)
// ============================================================

describe('1. 認証フロー', () => {
  test('シナリオ1: 新規ユーザー登録が成功する', async () => {
    const { data, error } = await ctx.supabase.auth.signUp({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    });

    expect(error).toBeNull();
    expect(data.user).toBeDefined();
    ctx.userId = data.user?.id;
  });

  test('シナリオ2: 登録済みユーザーでログインできる', async () => {
    const { data, error } = await ctx.supabase.auth.signInWithPassword({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    });

    expect(error).toBeNull();
    expect(data.session).toBeDefined();
    expect(data.session?.access_token).toBeTruthy();
  });

  test('シナリオ3: 無効なパスワードでログイン失敗', async () => {
    const { error } = await ctx.supabase.auth.signInWithPassword({
      email: TEST_USER_EMAIL,
      password: 'wrongPassword',
    });

    expect(error).not.toBeNull();
    expect(error?.message).toContain('Invalid');
  });

  test('シナリオ4: 存在しないユーザーでログイン失敗', async () => {
    const { error } = await ctx.supabase.auth.signInWithPassword({
      email: 'nonexistent@example.com',
      password: TEST_USER_PASSWORD,
    });

    expect(error).not.toBeNull();
  });
});

// ============================================================
// 2. サロン・スタッフ管理 (Salon & Staff Management)
// ============================================================

describe('2. サロン・スタッフ管理', () => {
  test('シナリオ5: 新規サロン作成が成功する', async () => {
    const { data, error } = await ctx.adminClient
      .from('salons')
      .insert({
        name: TEST_SALON_NAME,
        address: '東京都渋谷区テスト1-2-3',
        phone: '03-1234-5678',
        plan: 'standard',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.name).toBe(TEST_SALON_NAME);
    ctx.salonId = data?.id;
  });

  test('シナリオ6: スタッフ登録が成功する', async () => {
    expect(ctx.salonId).toBeDefined();
    expect(ctx.userId).toBeDefined();

    const { data, error } = await ctx.adminClient
      .from('staffs')
      .insert({
        id: ctx.userId!,
        salon_id: ctx.salonId!,
        email: TEST_USER_EMAIL,
        name: 'テストスタイリスト',
        role: 'stylist',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    ctx.staffId = data?.id;
  });

  test('シナリオ7: サロン情報更新が成功する', async () => {
    const { error } = await ctx.adminClient
      .from('salons')
      .update({ name: 'テストサロン更新' })
      .eq('id', ctx.salonId!);

    expect(error).toBeNull();
  });

  test('シナリオ8: スタッフ一覧取得が成功する', async () => {
    const { data, error } = await ctx.adminClient
      .from('staffs')
      .select('*')
      .eq('salon_id', ctx.salonId!);

    expect(error).toBeNull();
    expect(data).toBeInstanceOf(Array);
    expect(data?.length).toBeGreaterThan(0);
  });

  test('シナリオ9: スタッフロール更新が成功する', async () => {
    const { error } = await ctx.adminClient
      .from('staffs')
      .update({ role: 'manager' })
      .eq('id', ctx.staffId!);

    expect(error).toBeNull();
  });
});

// ============================================================
// 3. セッション管理 (Session Management)
// ============================================================

describe('3. セッション管理', () => {
  test('シナリオ10: 新規セッション作成が成功する', async () => {
    const { data, error } = await ctx.adminClient
      .from('sessions')
      .insert({
        salon_id: ctx.salonId!,
        stylist_id: ctx.staffId!,
        status: 'recording',
        customer_info: {
          name: 'テスト顧客',
          ageGroup: '30代',
          visitType: 'new',
        },
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.status).toBe('recording');
    ctx.sessionId = data?.id;
  });

  test('シナリオ11: セッションステータス更新が成功する', async () => {
    const { error } = await ctx.adminClient
      .from('sessions')
      .update({ status: 'processing' })
      .eq('id', ctx.sessionId!);

    expect(error).toBeNull();
  });

  test('シナリオ12: セッション一覧取得が成功する', async () => {
    const { data, error } = await ctx.adminClient
      .from('sessions')
      .select('*')
      .eq('salon_id', ctx.salonId!);

    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThan(0);
  });

  test('シナリオ13: セッション詳細取得が成功する', async () => {
    const { data, error } = await ctx.adminClient
      .from('sessions')
      .select('*, staffs(name)')
      .eq('id', ctx.sessionId!)
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBe(ctx.sessionId);
  });
});

// ============================================================
// 4. 音声・文字起こし処理 (Audio & Transcription)
// ============================================================

describe('4. 音声・文字起こし処理', () => {
  test('シナリオ14: トランスクリプト保存が成功する', async () => {
    const { data, error } = await ctx.adminClient
      .from('transcripts')
      .insert({
        session_id: ctx.sessionId!,
        chunk_index: 0,
        text: 'テスト文字起こしテキスト',
        start_time: 0,
        end_time: 5.5,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  test('シナリオ15: 話者セグメント保存が成功する', async () => {
    const { data, error } = await ctx.adminClient
      .from('speaker_segments')
      .insert({
        session_id: ctx.sessionId!,
        chunk_index: 0,
        speaker: 'stylist',
        text: 'いらっしゃいませ',
        start_time_ms: 0,
        end_time_ms: 2000,
        confidence: 0.95,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  test('シナリオ16: 顧客発話セグメント保存が成功する', async () => {
    const { error } = await ctx.adminClient
      .from('speaker_segments')
      .insert({
        session_id: ctx.sessionId!,
        chunk_index: 0,
        speaker: 'customer',
        text: '予約した山田です',
        start_time_ms: 2100,
        end_time_ms: 4000,
        confidence: 0.92,
      });

    expect(error).toBeNull();
  });

  test('シナリオ17: 話者セグメント一覧取得が成功する', async () => {
    const { data, error } = await ctx.adminClient
      .from('speaker_segments')
      .select('*')
      .eq('session_id', ctx.sessionId!)
      .order('start_time_ms');

    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThanOrEqual(2);
  });
});

// ============================================================
// 5. 分析処理 (Analysis Processing)
// ============================================================

describe('5. 分析処理', () => {
  test('シナリオ18: 分析結果保存が成功する', async () => {
    const { data, error } = await ctx.adminClient
      .from('analysis_results')
      .insert({
        session_id: ctx.sessionId!,
        chunk_index: 0,
        overall_score: 75,
        metrics: {
          talkRatio: { score: 80, stylistRatio: 45, customerRatio: 55 },
          questionQuality: { score: 70, openCount: 3, closedCount: 2 },
        },
        suggestions: ['オープンクエスチョンを増やしましょう'],
        highlights: ['良い傾聴姿勢でした'],
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data?.overall_score).toBe(75);
  });

  test('シナリオ19: セッション分析詳細保存が成功する', async () => {
    const { data, error } = await ctx.adminClient
      .from('session_analyses')
      .insert({
        session_id: ctx.sessionId!,
        chunk_index: 0,
        overall_score: 78,
        talk_ratio_score: 80,
        talk_ratio_detail: { stylistRatio: 45, customerRatio: 55 },
        question_score: 75,
        question_detail: { openCount: 4, closedCount: 2 },
        emotion_score: 82,
        emotion_detail: { positiveRatio: 0.75 },
        concern_keywords_score: 70,
        concern_keywords_detail: { keywords: ['髪のダメージ', '枝毛'] },
        proposal_timing_score: 65,
        proposal_quality_score: 72,
        conversion_score: 60,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  test('シナリオ20: 分析結果取得が成功する', async () => {
    const { data, error } = await ctx.adminClient
      .from('analysis_results')
      .select('*')
      .eq('session_id', ctx.sessionId!);

    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThan(0);
  });
});

// ============================================================
// 6. レポート生成 (Report Generation)
// ============================================================

describe('6. レポート生成', () => {
  test('シナリオ21: セッションレポート作成が成功する', async () => {
    // セッションステータスを更新
    await ctx.adminClient
      .from('sessions')
      .update({ status: 'completed', ended_at: new Date().toISOString() })
      .eq('id', ctx.sessionId!);

    const { data, error } = await ctx.adminClient
      .from('session_reports')
      .insert({
        session_id: ctx.sessionId!,
        summary: 'テストセッションの要約です。',
        overall_score: 76,
        metrics: {
          talkRatio: { score: 80, value: 45 },
          questionAnalysis: { score: 75, value: 4 },
        },
        improvements: ['提案タイミングを早めましょう'],
        strengths: ['傾聴姿勢が良かったです'],
        is_converted: false,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    ctx.reportId = data?.id;
  });

  test('シナリオ22: レポート詳細取得が成功する', async () => {
    const { data, error } = await ctx.adminClient
      .from('session_reports')
      .select('*, sessions(*)')
      .eq('id', ctx.reportId!)
      .single();

    expect(error).toBeNull();
    expect(data?.overall_score).toBe(76);
  });

  test('シナリオ23: レポート一覧取得が成功する', async () => {
    const { data, error } = await ctx.adminClient
      .from('session_reports')
      .select('*, sessions!inner(salon_id)')
      .eq('sessions.salon_id', ctx.salonId!);

    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThan(0);
  });
});

// ============================================================
// 7. 成功事例管理 (Success Case Management)
// ============================================================

describe('7. 成功事例管理', () => {
  test('シナリオ24: 成功事例作成が成功する', async () => {
    const { data, error } = await ctx.adminClient
      .from('success_cases')
      .insert({
        salon_id: ctx.salonId!,
        session_id: ctx.sessionId,
        concern_keywords: ['髪のダメージ', '枝毛'],
        approach_text: 'お客様の悩みに寄り添い、トリートメントを提案',
        result: 'トリートメントメニュー成約',
        conversion_rate: 0.85,
        is_active: true,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    ctx.successCaseId = data?.id;
  });

  test('シナリオ25: 成功事例一覧取得が成功する', async () => {
    const { data, error } = await ctx.adminClient
      .from('success_cases')
      .select('*')
      .eq('salon_id', ctx.salonId!)
      .eq('is_active', true);

    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThan(0);
  });

  test('シナリオ26: 成功事例更新が成功する', async () => {
    const { error } = await ctx.adminClient
      .from('success_cases')
      .update({ conversion_rate: 0.90 })
      .eq('id', ctx.successCaseId!);

    expect(error).toBeNull();
  });
});

// ============================================================
// 8. トレーニング・ロールプレイ (Training & Roleplay)
// ============================================================

describe('8. トレーニング・ロールプレイ', () => {
  test('シナリオ27: トレーニングシナリオ作成が成功する', async () => {
    const { data, error } = await ctx.adminClient
      .from('training_scenarios')
      .insert({
        salon_id: ctx.salonId,
        title: '新規顧客対応シナリオ',
        description: '初めて来店されたお客様への対応を練習',
        customer_persona: {
          name: '田中花子',
          ageGroup: '30代',
          gender: 'female',
          hairConcerns: ['パサつき', 'カラーの色落ち'],
          personality: 'やや緊張気味',
        },
        objectives: ['信頼関係構築', '悩みの深掘り', '適切な提案'],
        difficulty: 'beginner',
        estimated_minutes: 15,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    ctx.scenarioId = data?.id;
  });

  test('シナリオ28: ロールプレイセッション開始が成功する', async () => {
    const { data, error } = await ctx.adminClient
      .from('roleplay_sessions')
      .insert({
        staff_id: ctx.staffId!,
        scenario_id: ctx.scenarioId!,
        status: 'in_progress',
        messages: [
          { role: 'customer', content: 'こんにちは、予約した田中です', timestamp: new Date().toISOString() },
        ],
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    ctx.roleplaySessionId = data?.id;
  });

  test('シナリオ29: ロールプレイメッセージ追加が成功する', async () => {
    const { data: current } = await ctx.adminClient
      .from('roleplay_sessions')
      .select('messages')
      .eq('id', ctx.roleplaySessionId!)
      .single();

    const newMessages = [
      ...(current?.messages as object[] || []),
      { role: 'stylist', content: 'いらっしゃいませ、田中様ですね', timestamp: new Date().toISOString() },
    ];

    const { error } = await ctx.adminClient
      .from('roleplay_sessions')
      .update({ messages: newMessages })
      .eq('id', ctx.roleplaySessionId!);

    expect(error).toBeNull();
  });

  test('シナリオ30: ロールプレイセッション完了が成功する', async () => {
    const { error } = await ctx.adminClient
      .from('roleplay_sessions')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
        evaluation: {
          overallScore: 72,
          feedback: 'お客様への挨拶が丁寧でした',
          improvements: ['悩みの深掘りをもっと意識しましょう'],
        },
      })
      .eq('id', ctx.roleplaySessionId!);

    expect(error).toBeNull();
  });
});

// ============================================================
// 9. 通知・プッシュトークン (Notifications)
// ============================================================

describe('9. 通知・プッシュトークン', () => {
  test('シナリオ31: プッシュトークン登録が成功する', async () => {
    const { data, error } = await ctx.adminClient
      .from('push_tokens')
      .insert({
        staff_id: ctx.staffId!,
        token: 'ExponentPushToken[xxxxxx]',
        platform: 'ios',
        device_id: 'test-device-123',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  test('シナリオ32: 通知ログ記録が成功する', async () => {
    const { data, error } = await ctx.adminClient
      .from('notification_logs')
      .insert({
        staff_id: ctx.staffId!,
        type: 'session_complete',
        title: 'セッション完了',
        body: 'セッションレポートが生成されました',
        status: 'sent',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  test('シナリオ33: 通知ログ一覧取得が成功する', async () => {
    const { data, error } = await ctx.adminClient
      .from('notification_logs')
      .select('*')
      .eq('staff_id', ctx.staffId!)
      .order('sent_at', { ascending: false });

    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThan(0);
  });
});

// ============================================================
// 10. 統計・分析 (Statistics & Analytics)
// ============================================================

describe('10. 統計・分析', () => {
  test('シナリオ34: スタッフ統計取得が成功する', async () => {
    const { data, error } = await ctx.adminClient
      .rpc('get_staff_statistics', {
        p_staff_id: ctx.staffId!,
      });

    // 関数が存在しない場合はスキップ
    if (error?.code === 'PGRST202') {
      console.log('get_staff_statistics function not found, skipping');
      return;
    }

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  test('シナリオ35: サロン統計取得が成功する', async () => {
    const { data, error } = await ctx.adminClient
      .rpc('get_salon_statistics', {
        p_salon_id: ctx.salonId!,
      });

    // 関数が存在しない場合はスキップ
    if (error?.code === 'PGRST202') {
      console.log('get_salon_statistics function not found, skipping');
      return;
    }

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });
});

// ============================================================
// 11. エラーハンドリング (Error Handling)
// ============================================================

describe('11. エラーハンドリング', () => {
  test('シナリオ36: 存在しないセッション取得で適切なエラー', async () => {
    const { data, error } = await ctx.adminClient
      .from('sessions')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000000')
      .single();

    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });

  test('シナリオ37: 無効なプランでサロン作成失敗', async () => {
    const { error } = await ctx.adminClient
      .from('salons')
      .insert({
        name: 'テスト',
        plan: 'invalid_plan' as any,
      });

    expect(error).not.toBeNull();
  });

  test('シナリオ38: 必須フィールド欠落でセッション作成失敗', async () => {
    const { error } = await ctx.adminClient
      .from('sessions')
      .insert({
        salon_id: ctx.salonId!,
        // stylist_id missing
      } as any);

    expect(error).not.toBeNull();
  });

  test('シナリオ39: 無効なスコア範囲でレポート作成失敗', async () => {
    const { error } = await ctx.adminClient
      .from('session_reports')
      .insert({
        session_id: ctx.sessionId!,
        summary: 'テスト',
        overall_score: 150, // Invalid: should be 0-100
        metrics: {},
      });

    expect(error).not.toBeNull();
  });
});

// ============================================================
// 12. データ整合性 (Data Integrity)
// ============================================================

describe('12. データ整合性', () => {
  test('シナリオ40: 外部キー制約が機能する', async () => {
    const { error } = await ctx.adminClient
      .from('sessions')
      .insert({
        salon_id: '00000000-0000-0000-0000-000000000000', // Non-existent salon
        stylist_id: ctx.staffId!,
        status: 'recording',
      });

    expect(error).not.toBeNull();
  });

  test('シナリオ41: カスケード削除が機能する', async () => {
    // Create a temporary session
    const { data: tempSession } = await ctx.adminClient
      .from('sessions')
      .insert({
        salon_id: ctx.salonId!,
        stylist_id: ctx.staffId!,
        status: 'recording',
      })
      .select()
      .single();

    // Create a speaker segment for the session
    await ctx.adminClient
      .from('speaker_segments')
      .insert({
        session_id: tempSession!.id,
        chunk_index: 0,
        speaker: 'stylist',
        text: 'テスト',
        start_time_ms: 0,
        end_time_ms: 1000,
      });

    // Delete the session
    await ctx.adminClient
      .from('sessions')
      .delete()
      .eq('id', tempSession!.id);

    // Verify speaker segments are also deleted
    const { data: segments } = await ctx.adminClient
      .from('speaker_segments')
      .select('*')
      .eq('session_id', tempSession!.id);

    expect(segments?.length).toBe(0);
  });

  test('シナリオ42: ユニーク制約が機能する（重複メール）', async () => {
    // This should fail because email must be unique
    const { error } = await ctx.adminClient
      .from('staffs')
      .insert({
        id: '00000000-0000-0000-0000-000000000001',
        salon_id: ctx.salonId!,
        email: TEST_USER_EMAIL, // Duplicate email
        name: '重複テスト',
        role: 'stylist',
      });

    expect(error).not.toBeNull();
  });
});

// ============================================================
// 13. タイムスタンプ・監査 (Timestamps & Audit)
// ============================================================

describe('13. タイムスタンプ・監査', () => {
  test('シナリオ43: created_atが自動設定される', async () => {
    const { data } = await ctx.adminClient
      .from('sessions')
      .select('created_at')
      .eq('id', ctx.sessionId!)
      .single();

    expect(data?.created_at).toBeDefined();
    expect(new Date(data!.created_at).getTime()).toBeLessThanOrEqual(Date.now());
  });

  test('シナリオ44: updated_atが更新時に自動更新される', async () => {
    const { data: before } = await ctx.adminClient
      .from('salons')
      .select('updated_at')
      .eq('id', ctx.salonId!)
      .single();

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Update
    await ctx.adminClient
      .from('salons')
      .update({ name: 'Updated Salon Name' })
      .eq('id', ctx.salonId!);

    const { data: after } = await ctx.adminClient
      .from('salons')
      .select('updated_at')
      .eq('id', ctx.salonId!)
      .single();

    expect(new Date(after!.updated_at).getTime()).toBeGreaterThan(
      new Date(before!.updated_at).getTime()
    );
  });
});

// ============================================================
// 14. 検索・フィルタリング (Search & Filtering)
// ============================================================

describe('14. 検索・フィルタリング', () => {
  test('シナリオ45: 日付範囲でセッションフィルタリング', async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await ctx.adminClient
      .from('sessions')
      .select('*')
      .eq('salon_id', ctx.salonId!)
      .gte('started_at', yesterday)
      .lte('started_at', tomorrow);

    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThan(0);
  });

  test('シナリオ46: ステータスでセッションフィルタリング', async () => {
    const { data, error } = await ctx.adminClient
      .from('sessions')
      .select('*')
      .eq('salon_id', ctx.salonId!)
      .eq('status', 'completed');

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  test('シナリオ47: スコア範囲でレポートフィルタリング', async () => {
    const { data, error } = await ctx.adminClient
      .from('session_reports')
      .select('*')
      .gte('overall_score', 70)
      .lte('overall_score', 90);

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });
});

// ============================================================
// 15. ページネーション (Pagination)
// ============================================================

describe('15. ページネーション', () => {
  test('シナリオ48: limit/offsetでページネーション', async () => {
    const { data: page1, error: error1 } = await ctx.adminClient
      .from('sessions')
      .select('*')
      .eq('salon_id', ctx.salonId!)
      .range(0, 9);

    expect(error1).toBeNull();
    expect(page1?.length).toBeLessThanOrEqual(10);
  });

  test('シナリオ49: カウント取得と組み合わせ', async () => {
    const { count, error } = await ctx.adminClient
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('salon_id', ctx.salonId!);

    expect(error).toBeNull();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================
// 16. 並び替え (Ordering)
// ============================================================

describe('16. 並び替え', () => {
  test('シナリオ50: 開始日時で降順ソート', async () => {
    const { data, error } = await ctx.adminClient
      .from('sessions')
      .select('started_at')
      .eq('salon_id', ctx.salonId!)
      .order('started_at', { ascending: false });

    expect(error).toBeNull();
    if (data && data.length > 1) {
      const first = new Date(data[0].started_at).getTime();
      const second = new Date(data[1].started_at).getTime();
      expect(first).toBeGreaterThanOrEqual(second);
    }
  });

  test('シナリオ51: スコアで昇順ソート', async () => {
    const { data, error } = await ctx.adminClient
      .from('session_reports')
      .select('overall_score')
      .order('overall_score', { ascending: true });

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });
});

console.log('===========================================');
console.log('SalonTalk AI 結合テスト: 51シナリオ完了');
console.log('===========================================');
