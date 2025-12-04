/**
 * App Constants
 * アプリ定数
 */

/**
 * APIエンドポイント
 */
export const API_ENDPOINTS = {
  SESSIONS: '/rest/v1/sessions',
  REPORTS: '/rest/v1/session_reports',
  STAFF: '/rest/v1/staffs',
  SALONS: '/rest/v1/salons',
  SUCCESS_CASES: '/rest/v1/success_cases',
  TRAINING_SCENARIOS: '/rest/v1/training_scenarios',
  NOTIFICATIONS: '/rest/v1/notifications',
} as const;

/**
 * Edge Function エンドポイント
 */
export const EDGE_FUNCTIONS = {
  START_SESSION: 'start-session',
  END_SESSION: 'end-session',
  PROCESS_TRANSCRIPTION: 'process-transcription',
  ANALYZE_CONVERSATION: 'analyze-conversation',
  GENERATE_REPORT: 'generate-report',
  GET_REPORT: 'get-report',
  SEARCH_SUCCESS_CASES: 'search-success-cases',
  GET_TRAINING_SCENARIO: 'get-training-scenario',
  START_ROLEPLAY: 'start-roleplay',
  SEND_ROLEPLAY_MESSAGE: 'send-roleplay-message',
  END_ROLEPLAY: 'end-roleplay',
} as const;

/**
 * セッションステータス
 */
export const SESSION_STATUS = {
  RECORDING: 'recording',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  ERROR: 'error',
} as const;

/**
 * 分析指標の種類
 */
export const METRIC_TYPES = {
  TALK_RATIO: 'talk_ratio',
  QUESTION_ANALYSIS: 'question_analysis',
  EMOTION_ANALYSIS: 'emotion_analysis',
  CONCERN_KEYWORDS: 'concern_keywords',
  PROPOSAL_TIMING: 'proposal_timing',
  PROPOSAL_QUALITY: 'proposal_quality',
  CONVERSION: 'conversion',
} as const;

/**
 * 分析指標のラベル
 */
export const METRIC_LABELS: Record<string, { label: string; icon: string }> = {
  [METRIC_TYPES.TALK_RATIO]: { label: 'トーク比率', icon: '💬' },
  [METRIC_TYPES.QUESTION_ANALYSIS]: { label: '質問の質', icon: '❓' },
  [METRIC_TYPES.EMOTION_ANALYSIS]: { label: '感情分析', icon: '😊' },
  [METRIC_TYPES.CONCERN_KEYWORDS]: { label: '悩みキーワード', icon: '🔍' },
  [METRIC_TYPES.PROPOSAL_TIMING]: { label: '提案タイミング', icon: '⏱️' },
  [METRIC_TYPES.PROPOSAL_QUALITY]: { label: '提案の質', icon: '💡' },
  [METRIC_TYPES.CONVERSION]: { label: '成約判定', icon: '✅' },
};

/**
 * 年齢層オプション
 */
export const AGE_GROUP_OPTIONS = [
  { value: '10代', label: '10代' },
  { value: '20代', label: '20代' },
  { value: '30代', label: '30代' },
  { value: '40代', label: '40代' },
  { value: '50代', label: '50代' },
  { value: '60代以上', label: '60代以上' },
] as const;

/**
 * 性別オプション
 */
export const GENDER_OPTIONS = [
  { value: 'male', label: '男性' },
  { value: 'female', label: '女性' },
  { value: 'other', label: 'その他' },
] as const;

/**
 * 来店タイプオプション
 */
export const VISIT_TYPE_OPTIONS = [
  { value: 'new', label: '新規' },
  { value: 'repeat', label: 'リピーター' },
] as const;

/**
 * スコア閾値
 */
export const SCORE_THRESHOLDS = {
  EXCELLENT: 80,
  GOOD: 60,
  AVERAGE: 40,
} as const;

/**
 * アプリ設定のデフォルト値
 */
export const DEFAULT_SETTINGS = {
  NOTIFICATION_ENABLED: true,
  SOUND_ENABLED: true,
  VIBRATION_ENABLED: true,
  AUTO_START_RECORDING: false,
  LANGUAGE: 'ja',
} as const;

/**
 * アニメーション設定
 */
export const ANIMATION = {
  DURATION_SHORT: 200,
  DURATION_MEDIUM: 300,
  DURATION_LONG: 500,
} as const;

/**
 * ページネーション設定
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

/**
 * 録音設定
 */
export const AUDIO_CONFIG = {
  SAMPLE_RATE: 16000,
  CHANNELS: 1,
  BIT_DEPTH: 16,
  CHUNK_DURATION_MS: 10000, // 10秒ごとにチャンク
  MAX_DURATION_MS: 3600000, // 最大1時間
} as const;
