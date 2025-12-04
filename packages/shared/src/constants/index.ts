/**
 * Shared Constants
 * 共有定数定義
 */

// ===========================================
// Audio Processing Constants
// ===========================================

/**
 * 音声チャンクの長さ（秒）
 */
export const AUDIO_CHUNK_DURATION_SECONDS = 60;

/**
 * 音声チャンクの長さ（ミリ秒）
 */
export const AUDIO_CHUNK_DURATION_MS = AUDIO_CHUNK_DURATION_SECONDS * 1000;

/**
 * サポートする音声フォーマット
 */
export const SUPPORTED_AUDIO_FORMATS = ['wav', 'mp3', 'm4a', 'webm'] as const;

/**
 * 音声サンプルレート
 */
export const AUDIO_SAMPLE_RATE = 16000;

// ===========================================
// Analysis Constants
// ===========================================

/**
 * 7指標の重み
 */
export const METRIC_WEIGHTS = {
  TALK_RATIO: 0.25,
  QUESTION_QUALITY: 0.2,
  EMOTION: 0.15,
  CONCERN_KEYWORDS: 0.15,
  PROPOSAL_TIMING: 0.1,
  PROPOSAL_QUALITY: 0.1,
  CONVERSION: 0.05,
} as const;

/**
 * 理想的なトーク比率（美容師:お客様）
 */
export const IDEAL_TALK_RATIO = {
  STYLIST: 40,
  CUSTOMER: 60,
} as const;

/**
 * 理想的なオープン質問比率（%）
 */
export const IDEAL_OPEN_QUESTION_RATIO = 60;

/**
 * 理想的なポジティブ感情比率（%）
 */
export const IDEAL_POSITIVE_EMOTION_RATIO = 70;

/**
 * 理想的な悩みキーワード数
 */
export const IDEAL_CONCERN_KEYWORD_COUNT = 2;

/**
 * 理想的な提案タイミング（ミリ秒）
 */
export const IDEAL_PROPOSAL_TIMING_MS = 3 * 60 * 1000; // 3分

// ===========================================
// Session Constants
// ===========================================

/**
 * セッションタイムアウト（ミリ秒）
 */
export const SESSION_TIMEOUT_MS = 180 * 60 * 1000; // 3時間

/**
 * 最大同時セッション数（店舗あたり）
 */
export const MAX_CONCURRENT_SESSIONS = 10;

// ===========================================
// API Constants
// ===========================================

/**
 * APIタイムアウト（ミリ秒）
 */
export const API_TIMEOUT_MS = 30000;

/**
 * リトライ回数
 */
export const API_RETRY_COUNT = 3;

/**
 * リトライ間隔（ミリ秒）
 */
export const API_RETRY_DELAY_MS = 1000;

// ===========================================
// Vector Search Constants
// ===========================================

/**
 * 埋め込みベクトルの次元数
 */
export const EMBEDDING_DIMENSION = 1536;

/**
 * ベクトル検索の類似度閾値
 */
export const VECTOR_SEARCH_THRESHOLD = 0.7;

/**
 * ベクトル検索のデフォルト結果数
 */
export const VECTOR_SEARCH_DEFAULT_LIMIT = 5;

// ===========================================
// Concern Keywords
// ===========================================

/**
 * 悩みキーワードカテゴリ定義
 */
export const CONCERN_KEYWORD_PATTERNS = {
  dryness: ['乾燥', 'パサパサ', 'かさかさ', '潤い', '水分', 'しっとり'],
  damage: ['ダメージ', '傷み', '傷んで', '枝毛', '切れ毛', 'ケア'],
  frizz: ['広がる', 'パサつき', 'まとまらない', 'うねり', 'クセ', 'ボワボワ'],
  thinning: ['薄い', 'ボリューム', 'ペタンコ', '細い', 'ハリ', 'コシ'],
  gray_hair: ['白髪', 'グレイ', '染め', 'カバー', '目立つ'],
  scalp: ['頭皮', 'かゆい', 'フケ', 'べたつき', '地肌', '抜け毛'],
  styling: ['スタイリング', 'セット', 'キープ', '持ち', '巻き'],
  color: ['色落ち', '退色', 'カラー持ち', '明るく', '暗く'],
} as const;

// ===========================================
// Error Codes
// ===========================================

export const ERROR_CODES = {
  // 認証エラー (AUTH-xxx)
  AUTH_001: 'AUTH_001', // 認証トークン無効
  AUTH_002: 'AUTH_002', // 権限不足
  AUTH_003: 'AUTH_003', // セッション期限切れ

  // セッションエラー (SES-xxx)
  SES_001: 'SES_001', // セッションが見つからない
  SES_002: 'SES_002', // セッションはすでに終了している
  SES_003: 'SES_003', // セッション作成に失敗
  SES_004: 'SES_004', // アクティブセッションが存在する

  // AI分析エラー (AI-xxx)
  AI_001: 'AI_001', // Claude APIエラー
  AI_002: 'AI_002', // 分析タイムアウト
  AI_003: 'AI_003', // 分析結果のパースエラー

  // 話者分離エラー (DIA-xxx)
  DIA_001: 'DIA_001', // pyannoteサーバーエラー
  DIA_002: 'DIA_002', // 話者分離タイムアウト
  DIA_003: 'DIA_003', // 音声フォーマットエラー

  // ネットワークエラー (NET-xxx)
  NET_001: 'NET_001', // ネットワーク接続エラー
  NET_002: 'NET_002', // タイムアウト
  NET_003: 'NET_003', // サーバーエラー

  // バリデーションエラー (VAL-xxx)
  VAL_001: 'VAL_001', // 必須パラメータ不足
  VAL_002: 'VAL_002', // 不正なパラメータ形式
  VAL_003: 'VAL_003', // パラメータ範囲外

  // データベースエラー (DB-xxx)
  DB_001: 'DB_001', // レコードが見つからない
  DB_002: 'DB_002', // 書き込みエラー
  DB_003: 'DB_003', // 一意性制約違反
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// ===========================================
// Plans
// ===========================================

export const PLAN_FEATURES = {
  free: {
    name: 'Free',
    maxSessions: 10,
    maxStaff: 2,
    analyticsRetentionDays: 7,
    realtimeAnalysis: false,
    successCaseSearch: false,
    roleplay: false,
  },
  standard: {
    name: 'Standard',
    maxSessions: 100,
    maxStaff: 10,
    analyticsRetentionDays: 90,
    realtimeAnalysis: true,
    successCaseSearch: true,
    roleplay: false,
  },
  premium: {
    name: 'Premium',
    maxSessions: -1, // 無制限
    maxStaff: 50,
    analyticsRetentionDays: 365,
    realtimeAnalysis: true,
    successCaseSearch: true,
    roleplay: true,
  },
  enterprise: {
    name: 'Enterprise',
    maxSessions: -1,
    maxStaff: -1,
    analyticsRetentionDays: -1,
    realtimeAnalysis: true,
    successCaseSearch: true,
    roleplay: true,
  },
} as const;
