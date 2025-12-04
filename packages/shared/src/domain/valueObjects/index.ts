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

// ID Factory functions
export const createSalonId = (id: string): SalonId => id as SalonId;
export const createStaffId = (id: string): StaffId => id as StaffId;
export const createSessionId = (id: string): SessionId => id as SessionId;
export const createSegmentId = (id: string): SegmentId => id as SegmentId;
export const createAnalysisId = (id: string): AnalysisId => id as AnalysisId;
export const createSuccessCaseId = (id: string): SuccessCaseId => id as SuccessCaseId;
export const createReportId = (id: string): ReportId => id as ReportId;

/**
 * プラン種別
 */
export type Plan = 'free' | 'standard' | 'premium' | 'enterprise';

/**
 * スタッフ役割
 */
export type StaffRole = 'stylist' | 'manager' | 'owner' | 'admin';

/**
 * セッションステータス
 */
export type SessionStatus = 'recording' | 'processing' | 'analyzing' | 'completed' | 'error';

/**
 * 話者種別
 */
export type SpeakerType = 'stylist' | 'customer';

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
 * 各指標の重み付け
 */
export const METRIC_WEIGHTS = {
  talkRatio: 0.25,
  questionQuality: 0.2,
  emotion: 0.15,
  concernKeywords: 0.15,
  proposalTiming: 0.1,
  proposalQuality: 0.1,
  conversion: 0.05,
} as const;

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
