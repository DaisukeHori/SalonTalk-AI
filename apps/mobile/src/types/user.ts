/**
 * User Types
 * ユーザー・スタッフ関連の型定義
 */

/**
 * スタッフロール
 */
export type StaffRole = 'owner' | 'manager' | 'stylist';

/**
 * 認証ユーザー
 */
export interface AuthUser {
  id: string;
  email: string;
  staffId: string;
  salonId: string;
  role: StaffRole;
  name: string;
  avatarUrl: string | null;
}

/**
 * スタッフ基本情報
 */
export interface Staff {
  id: string;
  salonId: string;
  name: string;
  email: string;
  role: StaffRole;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * スタッフ詳細情報
 */
export interface StaffDetail extends Staff {
  totalSessions: number;
  averageScore: number;
  conversionRate: number;
  recentSessions: Array<{
    id: string;
    date: string;
    score: number;
  }>;
}

/**
 * スタッフ統計
 */
export interface StaffStats {
  staffId: string;
  period: 'week' | 'month' | 'year';
  sessionCount: number;
  averageScore: number;
  conversionRate: number;
  scoresByMetric: Record<string, number>;
  trend: 'up' | 'down' | 'stable';
}

/**
 * サロン情報
 */
export interface Salon {
  id: string;
  name: string;
  address: string;
  phoneNumber: string;
  email: string;
  logoUrl: string | null;
  plan: 'trial' | 'basic' | 'professional' | 'enterprise';
  createdAt: string;
  updatedAt: string;
}

/**
 * ユーザー設定
 */
export interface UserSettings {
  notificationEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  autoStartRecording: boolean;
  language: 'ja' | 'en';
  theme: 'light' | 'dark' | 'system';
}

/**
 * 通知設定
 */
export interface NotificationPreferences {
  sessionComplete: boolean;
  reportReady: boolean;
  dailySummary: boolean;
  weeklySummary: boolean;
  achievementUnlocked: boolean;
  systemAnnouncements: boolean;
}

/**
 * プロフィール更新パラメータ
 */
export interface UpdateProfileParams {
  name?: string;
  avatarUrl?: string;
}

/**
 * パスワード変更パラメータ
 */
export interface ChangePasswordParams {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
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
  salonCode?: string;
}
