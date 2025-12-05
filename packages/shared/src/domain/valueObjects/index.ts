/**
 * Value Objects
 * 値オブジェクト定義
 */

// Branded Types for type-safe IDs
declare const brand: unique symbol;
type Brand<T, B> = T & { readonly [brand]: B };

export type SalonId = Brand<string, 'SalonId'>;
export type StaffId = Brand<string, 'StaffId'>;
export type SessionId = Brand<string, 'SessionId'>;
export type SegmentId = Brand<string, 'SegmentId'>;
export type AnalysisId = Brand<string, 'AnalysisId'>;
export type SuccessCaseId = Brand<string, 'SuccessCaseId'>;
export type ReportId = Brand<string, 'ReportId'>;
export type TranscriptId = Brand<string, 'TranscriptId'>;
export type SpeakerSegmentId = Brand<string, 'SpeakerSegmentId'>;
export type SessionAnalysisId = Brand<string, 'SessionAnalysisId'>;
export type SessionReportId = Brand<string, 'SessionReportId'>;
export type NotificationId = Brand<string, 'NotificationId'>;
export type PushTokenId = Brand<string, 'PushTokenId'>;
export type ScenarioId = Brand<string, 'ScenarioId'>;
export type RoleplaySessionId = Brand<string, 'RoleplaySessionId'>;

// ID Factory functions
export const createSalonId = (id: string): SalonId => id as SalonId;
export const createStaffId = (id: string): StaffId => id as StaffId;
export const createSessionId = (id: string): SessionId => id as SessionId;
export const createSegmentId = (id: string): SegmentId => id as SegmentId;
export const createAnalysisId = (id: string): AnalysisId => id as AnalysisId;
export const createSuccessCaseId = (id: string): SuccessCaseId => id as SuccessCaseId;
export const createReportId = (id: string): ReportId => id as ReportId;
export const createTranscriptId = (id: string): TranscriptId => id as TranscriptId;
export const createSpeakerSegmentId = (id: string): SpeakerSegmentId => id as SpeakerSegmentId;
export const createSessionAnalysisId = (id: string): SessionAnalysisId => id as SessionAnalysisId;
export const createSessionReportId = (id: string): SessionReportId => id as SessionReportId;
export const createNotificationId = (id: string): NotificationId => id as NotificationId;
export const createPushTokenId = (id: string): PushTokenId => id as PushTokenId;
export const createScenarioId = (id: string): ScenarioId => id as ScenarioId;
export const createRoleplaySessionId = (id: string): RoleplaySessionId => id as RoleplaySessionId;

/**
 * プラン種別
 */
export type Plan = 'free' | 'standard' | 'premium' | 'enterprise';

/**
 * スタッフ役割
 */
export type StaffRole = 'stylist' | 'manager' | 'owner' | 'admin' | 'assistant';

/**
 * セッションステータス
 */
export type SessionStatus = 'recording' | 'processing' | 'analyzing' | 'completed' | 'error';

/**
 * 話者分離ステータス
 */
export type DiarizationStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * ロールプレイステータス
 */
export type RoleplayStatus = 'in_progress' | 'completed' | 'abandoned' | 'evaluated';

/**
 * 通知タイプ
 */
export type NotificationType =
  | 'session_complete'
  | 'training_reminder'
  | 'score_alert'
  | 'success_case'
  | 'proposal_chance'
  | 'concern_detected'
  | 'achievement'
  | 'custom'
  // FR-304: 詳細アラート種別
  | 'risk_warning'              // リスク警告（総合スコア低下）
  | 'talk_ratio_alert'          // トーク比率アラート（話しすぎ警告）
  | 'low_engagement_alert'      // 低エンゲージメント警告
  | 'emotion_negative_alert'    // お客様ネガティブ反応警告
  | 'question_shortage_alert'   // 質問不足警告
  | 'long_silence_alert'        // 長時間沈黙警告
  | 'proposal_missed_alert';    // 提案機会見逃し警告

/**
 * 通知ステータス
 */
export type NotificationStatus = 'sent' | 'delivered' | 'failed' | 'read';

/**
 * プラットフォーム種別
 */
export type Platform = 'ios' | 'android' | 'web';

/**
 * 話者種別
 */
export type SpeakerType = 'stylist' | 'customer';

/**
 * 話者ラベル（pyannote出力）
 */
export type SpeakerLabel = 'SPEAKER_00' | 'SPEAKER_01' | string;

/**
 * 顧客年代
 */
export type AgeGroup = '10s' | '20s' | '30s' | '40s' | '50s' | '60s' | '70s_plus';

/**
 * 性別
 */
export type Gender = 'male' | 'female' | 'other';

/**
 * 来店種別
 */
export type VisitType = 'new' | 'repeat';

/**
 * 店舗設定
 */
export interface SalonSettings {
  readonly language: 'ja' | 'en';
  readonly timezone: string;
  readonly recordingEnabled: boolean;
  readonly analysisEnabled: boolean;
  readonly notificationsEnabled: boolean;
  readonly maxConcurrentSessions: number;
  readonly sessionTimeoutMinutes: number;
  readonly dataRetentionDays: number;
}

export const defaultSalonSettings: SalonSettings = {
  language: 'ja',
  timezone: 'Asia/Tokyo',
  recordingEnabled: true,
  analysisEnabled: true,
  notificationsEnabled: true,
  maxConcurrentSessions: 10,
  sessionTimeoutMinutes: 180,
  dataRetentionDays: 365,
};

/**
 * 顧客情報
 */
export interface CustomerInfo {
  readonly name?: string;
  readonly ageGroup?: AgeGroup;
  readonly gender?: Gender;
  readonly visitType: VisitType;
  readonly previousVisitCount?: number;
  readonly notes?: string;
}

/**
 * トーク比率
 */
export interface TalkRatio {
  readonly stylistRatio: number; // 0-100
  readonly customerRatio: number; // 0-100
  readonly score: number; // 0-100 (40:60が理想で最高点)
  readonly totalDurationMs: number;
  readonly stylistDurationMs: number;
  readonly customerDurationMs: number;
}

/**
 * 質問分析
 */
export interface QuestionAnalysis {
  readonly openQuestionCount: number;
  readonly closedQuestionCount: number;
  readonly totalQuestionCount: number;
  readonly openRatio: number; // 0-100
  readonly score: number; // 0-100
  readonly questions: QuestionItem[];
}

export interface QuestionItem {
  readonly text: string;
  readonly type: 'open' | 'closed';
  readonly timestamp: number;
}

/**
 * 感情分析
 */
export interface EmotionAnalysis {
  readonly positiveRatio: number; // 0-100
  readonly neutralRatio: number;
  readonly negativeRatio: number;
  readonly score: number; // 0-100
  readonly emotionTimeline: EmotionPoint[];
}

export interface EmotionPoint {
  readonly timestamp: number;
  readonly emotion: 'positive' | 'neutral' | 'negative';
  readonly confidence: number;
}

/**
 * 悩みキーワード
 */
export interface ConcernKeywords {
  readonly keywords: ConcernKeyword[];
  readonly count: number;
  readonly score: number; // 0-100 (2個以上で高得点)
}

export interface ConcernKeyword {
  readonly keyword: string;
  readonly category: ConcernCategory;
  readonly timestamp: number;
  readonly context: string;
}

export type ConcernCategory =
  | 'dryness' // 乾燥
  | 'damage' // ダメージ
  | 'frizz' // 広がり・パサつき
  | 'thinning' // 薄毛・ボリューム不足
  | 'gray_hair' // 白髪
  | 'scalp' // 頭皮トラブル
  | 'styling' // スタイリング
  | 'color' // カラー持ち
  | 'other';

/**
 * 提案タイミング
 */
export interface ProposalTiming {
  readonly concernDetectedAt?: number;
  readonly proposalMadeAt?: number;
  readonly timingMs?: number;
  readonly score: number; // 0-100 (3分以内が理想)
  readonly isOptimal: boolean;
}

/**
 * 提案の質
 */
export interface ProposalQuality {
  readonly proposals: Proposal[];
  readonly matchRate: number; // 0-100
  readonly score: number;
}

export interface Proposal {
  readonly text: string;
  readonly timestamp: number;
  readonly matchedConcern?: string;
  readonly productMentioned?: string;
}

/**
 * 成約情報
 */
export interface ConversionInfo {
  readonly isConverted: boolean;
  readonly productName?: string;
  readonly productCategory?: string;
  readonly amount?: number;
  readonly score: number; // 0 or 100
}

/**
 * 分析メトリクス（7指標）
 */
export interface AnalysisMetrics {
  readonly talkRatio: TalkRatio;
  readonly questionQuality: QuestionAnalysis;
  readonly emotion: EmotionAnalysis;
  readonly concernKeywords: ConcernKeywords;
  readonly proposalTiming: ProposalTiming;
  readonly proposalQuality: ProposalQuality;
  readonly conversion: ConversionInfo;
}

/**
 * 各指標の重み付け（設計書準拠）
 */
export const METRIC_WEIGHTS = {
  talkRatio: 0.15,
  questionQuality: 0.15,
  emotion: 0.15,
  concernKeywords: 0.10,
  proposalTiming: 0.15,
  proposalQuality: 0.15,
  conversion: 0.15,
} as const;

/**
 * 指標タイプ
 */
export type IndicatorType =
  | 'talk_ratio'
  | 'question_analysis'
  | 'emotion_analysis'
  | 'concern_keywords'
  | 'proposal_timing'
  | 'proposal_quality'
  | 'conversion';

export const IndicatorTypeDisplay: Record<IndicatorType, string> = {
  talk_ratio: 'トーク比率',
  question_analysis: '質問分析',
  emotion_analysis: '感情分析',
  concern_keywords: '悩みキーワード',
  proposal_timing: '提案タイミング',
  proposal_quality: '提案品質',
  conversion: '成約判定',
};

/**
 * 来店頻度
 */
export type VisitFrequency = 'first' | 'monthly' | 'bimonthly' | 'quarterly' | 'irregular';

export const VisitFrequencyDisplay: Record<VisitFrequency, string> = {
  first: '初めて',
  monthly: '月1回',
  bimonthly: '2ヶ月に1回',
  quarterly: '3ヶ月に1回',
  irregular: '不定期',
};

/**
 * 年代表示
 */
export const AgeGroupDisplay: Record<AgeGroup, string> = {
  '10s': '10代',
  '20s': '20代',
  '30s': '30代',
  '40s': '40代',
  '50s': '50代',
  '60s': '60代',
  '70s_plus': '70代以上',
};

/**
 * 性別表示
 */
export const GenderDisplay: Record<Gender, string> = {
  male: '男性',
  female: '女性',
  other: 'その他',
};

/**
 * スタッフ役割表示
 */
export const StaffRoleDisplay: Record<StaffRole, string> = {
  owner: 'オーナー',
  manager: 'マネージャー',
  stylist: 'スタイリスト',
  admin: '管理者',
  assistant: 'アシスタント',
};

/**
 * プラン表示
 */
export const PlanDisplay: Record<Plan, string> = {
  free: 'フリー',
  standard: 'スタンダード',
  premium: 'プレミアム',
  enterprise: 'エンタープライズ',
};

/**
 * セッションステータス表示
 */
export const SessionStatusDisplay: Record<SessionStatus, string> = {
  recording: '録音中',
  processing: '処理中',
  analyzing: '分析中',
  completed: '完了',
  error: 'エラー',
};

/**
 * スコアランク
 */
export type ScoreRank = 'S' | 'A' | 'B' | 'C' | 'D';

export function getScoreRank(score: number): ScoreRank {
  if (score >= 90) return 'S';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  return 'D';
}

/**
 * ベクトル埋め込み
 */
export type Embedding = number[];
export const EMBEDDING_DIMENSION = 1536;

export const isValidEmbedding = (embedding: unknown): embedding is Embedding => {
  return (
    Array.isArray(embedding) &&
    embedding.length === EMBEDDING_DIMENSION &&
    embedding.every(v => typeof v === 'number' && !isNaN(v))
  );
};

/**
 * 総合スコア計算
 */
export function calculateOverallScore(metrics: AnalysisMetrics): number {
  const weightedScore =
    metrics.talkRatio.score * METRIC_WEIGHTS.talkRatio +
    metrics.questionQuality.score * METRIC_WEIGHTS.questionQuality +
    metrics.emotion.score * METRIC_WEIGHTS.emotion +
    metrics.concernKeywords.score * METRIC_WEIGHTS.concernKeywords +
    metrics.proposalTiming.score * METRIC_WEIGHTS.proposalTiming +
    metrics.proposalQuality.score * METRIC_WEIGHTS.proposalQuality +
    metrics.conversion.score * METRIC_WEIGHTS.conversion;

  return Math.round(weightedScore);
}
