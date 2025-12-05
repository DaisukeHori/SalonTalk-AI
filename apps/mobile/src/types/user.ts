/**
 * User Types
 * ユーザー・スタッフ関連の型定義
 *
 * 方針: Supabase生成型と同じsnake_caseを使用
 * 詳細は docs/詳細設計書/12-付録.md を参照
 */

/**
 * スタッフロール
 * DBスキーマ: CHECK (role IN ('stylist', 'manager', 'owner', 'admin', 'assistant'))
 */
export type StaffRole = 'stylist' | 'manager' | 'owner' | 'admin' | 'assistant';

/**
 * 認証ユーザー
 */
export interface AuthUser {
  id: string;
  email: string;
  staff_id: string;
  salon_id: string;
  role: StaffRole;
  name: string;
  avatar_url: string | null;
}

/**
 * スタッフ基本情報
 */
export interface Staff {
  id: string;
  salon_id: string;
  name: string;
  email: string;
  role: StaffRole;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * スタッフ詳細情報
 */
export interface StaffDetail extends Staff {
  total_sessions: number;
  average_score: number;
  conversion_rate: number;
  recent_sessions: Array<{
    id: string;
    date: string;
    score: number;
  }>;
}

/**
 * スタッフ統計
 */
export interface StaffStats {
  staff_id: string;
  period: 'week' | 'month' | 'year';
  session_count: number;
  average_score: number;
  conversion_rate: number;
  scores_by_metric: Record<string, number>;
  trend: 'up' | 'down' | 'stable';
}

/**
 * サロンプラン
 */
export type SalonPlan = 'free' | 'standard' | 'premium' | 'enterprise';

/**
 * サロン情報
 */
export interface Salon {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  plan: SalonPlan;
  seats_count: number | null;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * ユーザー設定
 */
export interface UserSettings {
  notification_enabled: boolean;
  sound_enabled: boolean;
  vibration_enabled: boolean;
  auto_start_recording: boolean;
  language: 'ja' | 'en';
  theme: 'light' | 'dark' | 'system';
}

/**
 * 通知設定
 */
export interface NotificationPreferences {
  session_complete: boolean;
  report_ready: boolean;
  daily_summary: boolean;
  weekly_summary: boolean;
  achievement_unlocked: boolean;
  system_announcements: boolean;
}

/**
 * プロフィール更新パラメータ
 */
export interface UpdateProfileParams {
  name?: string;
  avatar_url?: string;
}

/**
 * パスワード変更パラメータ
 */
export interface ChangePasswordParams {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

/**
 * ログイン資格情報
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * 登録パラメータ
 */
export interface RegisterParams {
  email: string;
  password: string;
  name: string;
  salon_code?: string;
}
