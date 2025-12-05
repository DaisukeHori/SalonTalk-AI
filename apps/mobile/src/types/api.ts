/**
 * API Types
 * API関連の型定義
 */

/**
 * APIエラー
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * API共通レスポンス
 */
export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}

/**
 * ページネーションパラメータ
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

/**
 * ページネーションレスポンス
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  nextCursor?: string;
}

/**
 * セッション開始レスポンス
 */
export interface StartSessionResponse {
  session_id: string;
  status: 'recording';
  realtime_channel: string;
  started_at: string;
}

/**
 * セッション終了レスポンス
 */
export interface EndSessionResponse {
  session_id: string;
  status: 'processing';
  ended_at: string;
  total_duration_ms: number;
}

/**
 * レポート生成レスポンス
 */
export interface GenerateReportResponse {
  report_id: string;
  summary: string;
  overall_score: number;
  improvements: string[];
  strengths: string[];
  generated_at: string;
}

/**
 * 成功事例検索レスポンス
 */
export interface SearchSuccessCasesResponse {
  cases: Array<{
    id: string;
    similarity: number;
    approach_text: string;
    concern_keywords: string[];
  }>;
  total: number;
}

/**
 * トレーニングシナリオ
 */
export interface TrainingScenario {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  estimated_minutes: number;
  objectives: string[];
  customer_persona: {
    age_group: string;
    gender: string;
    personality: string;
    concerns: string[];
  };
}

/**
 * ロールプレイ開始レスポンス
 */
export interface StartRoleplayResponse {
  session_id: string;
  initial_message: string;
  scenario: TrainingScenario;
}

/**
 * ロールプレイメッセージレスポンス
 */
export interface RoleplayMessageResponse {
  customer_response: string;
  hints?: string[];
  current_score?: number;
}

/**
 * ロールプレイ終了結果
 */
export interface RoleplayEndResult {
  session_id: string;
  overall_score: number;
  feedback: string;
  improvements: string[];
  strengths: string[];
}

/**
 * ログインレスポンス
 */
export interface LoginResponse {
  user: {
    id: string;
    email: string;
  };
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
}

/**
 * リフレッシュトークンレスポンス
 */
export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

/**
 * プッシュ通知登録パラメータ
 */
export interface RegisterPushTokenParams {
  token: string;
  platform: 'ios' | 'android';
}

/**
 * 通知一覧レスポンス
 */
export interface NotificationsResponse {
  notifications: Array<{
    id: string;
    type: string;
    title: string;
    body: string;
    data: Record<string, unknown>;
    read_at: string | null;
    created_at: string;
  }>;
  unread_count: number;
}

/**
 * エクスポートリクエスト
 */
export interface ExportRequest {
  type: 'sessions' | 'reports' | 'analytics';
  format: 'csv' | 'pdf' | 'excel';
  dateRange?: {
    start: string;
    end: string;
  };
  filters?: Record<string, unknown>;
}

/**
 * エクスポートレスポンス
 */
export interface ExportResponse {
  downloadUrl: string;
  expiresAt: string;
  fileSize: number;
}
