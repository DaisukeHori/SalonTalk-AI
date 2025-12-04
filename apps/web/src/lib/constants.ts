/**
 * Constants
 * 定数定義
 */

// App Info
export const APP_NAME = 'SalonTalk AI';
export const APP_VERSION = '1.0.0';
export const APP_DESCRIPTION = '美容サロン向けAI接客分析・トレーニングシステム';

// Analysis Metrics (7 indicators)
export const ANALYSIS_METRICS = {
  TALK_RATIO: {
    key: 'talk_ratio',
    name: '会話バランス',
    description: '顧客の発話割合（理想: 60-70%）',
    weight: 0.15,
    maxScore: 100,
  },
  QUESTION_ANALYSIS: {
    key: 'question_analysis',
    name: '質問力',
    description: 'オープン質問の適切な使用',
    weight: 0.15,
    maxScore: 100,
  },
  EMOTION_ANALYSIS: {
    key: 'emotion_analysis',
    name: '感情対応',
    description: '共感表現とネガティブ感情への対応',
    weight: 0.15,
    maxScore: 100,
  },
  CONCERN_KEYWORDS: {
    key: 'concern_keywords',
    name: '悩みキーワード',
    description: '悩みキーワードの検出と対応',
    weight: 0.10,
    maxScore: 100,
  },
  PROPOSAL_TIMING: {
    key: 'proposal_timing',
    name: '提案タイミング',
    description: '適切なタイミングでの提案',
    weight: 0.15,
    maxScore: 100,
  },
  PROPOSAL_QUALITY: {
    key: 'proposal_quality',
    name: '提案品質',
    description: '悩みに対する提案の適切さ',
    weight: 0.15,
    maxScore: 100,
  },
  CONVERSION: {
    key: 'conversion',
    name: '成約',
    description: '提案後の成約/購入',
    weight: 0.15,
    maxScore: 100,
  },
} as const;

// Role labels
export const ROLE_LABELS = {
  admin: '管理者',
  manager: 'マネージャー',
  staff: 'スタッフ',
  stylist: 'スタイリスト',
  receptionist: 'レセプション',
} as const;

// Status labels
export const STATUS_LABELS = {
  active: '有効',
  inactive: '無効',
  pending: '保留中',
  completed: '完了',
} as const;

// Session status labels
export const SESSION_STATUS_LABELS = {
  recording: '録音中',
  processing: '処理中',
  completed: '完了',
  failed: '失敗',
} as const;

// Concern keyword categories
export const CONCERN_CATEGORIES = {
  hair: {
    name: '髪の悩み',
    keywords: ['パサパサ', '広がる', '細い', '抜け毛', 'ボリューム', 'くせ毛', '傷み', '枝毛'],
  },
  scalp: {
    name: '頭皮の悩み',
    keywords: ['かゆい', 'フケ', 'べたつき', '乾燥', '臭い', '赤み', '敏感'],
  },
  style: {
    name: 'スタイルの悩み',
    keywords: ['似合わない', '決まらない', 'セットできない', 'まとまらない', '長さ', 'イメチェン'],
  },
  color: {
    name: 'カラーの悩み',
    keywords: ['色落ち', '白髪', 'ダメージ', 'ムラ', '明るすぎ', '暗すぎ'],
  },
} as const;

// Date range presets
export const DATE_RANGE_PRESETS = [
  { label: '今日', days: 0 },
  { label: '過去7日', days: 7 },
  { label: '過去30日', days: 30 },
  { label: '過去90日', days: 90 },
  { label: '今月', days: -1 }, // Special case for current month
  { label: '先月', days: -2 }, // Special case for previous month
] as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const;

// Audio settings
export const AUDIO_SETTINGS = {
  CHUNK_DURATION_MS: 60000, // 60 seconds
  MAX_RECORDING_DURATION_MS: 7200000, // 2 hours
  SAMPLE_RATE: 16000,
  CHANNELS: 1,
} as const;

// Real-time settings
export const REALTIME_SETTINGS = {
  RECONNECT_DELAY_MS: 3000,
  HEARTBEAT_INTERVAL_MS: 30000,
  SESSION_TIMEOUT_MS: 10800000, // 3 hours
} as const;

// Score thresholds
export const SCORE_THRESHOLDS = {
  EXCELLENT: 80,
  GOOD: 60,
  NEEDS_IMPROVEMENT: 40,
} as const;

// API endpoints (for reference)
export const API_ENDPOINTS = {
  AUTH: {
    SIGNIN: '/api/auth/signin',
    SIGNOUT: '/api/auth/signout',
    ME: '/api/auth/me',
    REFRESH: '/api/auth/refresh',
  },
  SESSIONS: {
    LIST: '/api/sessions',
    DETAIL: (id: string) => `/api/sessions/${id}`,
    ANALYSIS: (id: string) => `/api/sessions/${id}/analysis`,
  },
  STAFF: {
    LIST: '/api/staff',
    DETAIL: (id: string) => `/api/staff/${id}`,
    RANKING: '/api/staff/ranking',
  },
  ANALYTICS: {
    SUMMARY: '/api/analytics',
    TRENDS: '/api/analytics/trends',
    COMPARE: '/api/analytics/compare',
    EXPORT: '/api/analytics/export',
  },
  SUCCESS_CASES: {
    LIST: '/api/success-cases',
    SEARCH: '/api/success-cases/search',
  },
} as const;
