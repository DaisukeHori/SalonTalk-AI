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
  sessionId: string;
  status: 'recording';
  realtimeChannel: string;
  startedAt: string;
}

/**
 * セッション終了レスポンス
 */
export interface EndSessionResponse {
  sessionId: string;
  status: 'processing';
  endedAt: string;
  totalDurationMs: number;
}

/**
 * レポート生成レスポンス
 */
export interface GenerateReportResponse {
  reportId: string;
  summary: string;
  overallScore: number;
  improvements: string[];
  strengths: string[];
  generatedAt: string;
}

/**
 * 成功事例検索レスポンス
 */
export interface SearchSuccessCasesResponse {
  cases: Array<{
    id: string;
    similarity: number;
    approachText: string;
    concernKeywords: string[];
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
  estimatedMinutes: number;
  objectives: string[];
  customerPersona: {
    ageGroup: string;
    gender: string;
    personality: string;
    concerns: string[];
  };
}

/**
 * ロールプレイ開始レスポンス
 */
export interface StartRoleplayResponse {
  sessionId: string;
  initialMessage: string;
  scenario: TrainingScenario;
}

/**
 * ロールプレイメッセージレスポンス
 */
export interface RoleplayMessageResponse {
  customerResponse: string;
  hints?: string[];
  currentScore?: number;
}

/**
 * ロールプレイ終了結果
 */
export interface RoleplayEndResult {
  sessionId: string;
  overallScore: number;
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
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  };
}

/**
 * リフレッシュトークンレスポンス
 */
export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
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
    readAt: string | null;
    createdAt: string;
  }>;
  unreadCount: number;
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
