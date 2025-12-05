/**
 * Domain Entities
 * ドメインエンティティ定義
 *
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  🔴 警告: このファイルは概念モデル（設計ドキュメント）です                    ║
 * ║  実装では絶対に使用しないでください！                                       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * 2025-12-05 決定: プロジェクト全体で snake_case 統一
 * ================================================
 *
 * このファイルの型定義（camelCase）は概念モデルとしてのみ維持しています。
 * 実装では Supabase 生成型（snake_case）を単一ソースとして使用してください。
 *
 * 詳細は以下を参照:
 * - CLAUDE.md「snake_case 統一規則」
 * - docs/詳細設計書/12-付録.md
 *
 * ❌ 禁止:
 * ```typescript
 * import { Staff, Session } from '@salontalk/shared';
 * ```
 *
 * ✅ 推奨:
 * ```typescript
 * import type { Database } from '@/types/database';
 * type Staff = Database['public']['Tables']['staffs']['Row'];
 * type Session = Database['public']['Tables']['sessions']['Row'];
 * ```
 */

import type {
  SalonId,
  StaffId,
  SessionId,
  SegmentId,
  AnalysisId,
  SuccessCaseId,
  ReportId,
  TranscriptId,
  SpeakerSegmentId,
  SessionAnalysisId,
  SessionReportId,
  NotificationId,
  PushTokenId,
  Plan,
  StaffRole,
  SessionStatus,
  NotificationType,
  NotificationStatus,
  Platform,
  SpeakerType,
  SpeakerLabel,
  SalonSettings,
  CustomerInfo,
  AnalysisMetrics,
} from '../valueObjects';

/**
 * 店舗エンティティ
 */
export interface Salon {
  readonly id: SalonId;
  readonly name: string;
  readonly address: string | null;
  readonly phone: string | null;
  readonly plan: Plan;
  readonly seatsCount: number | null;
  readonly settings: SalonSettings;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateSalonParams {
  name: string;
  address?: string;
  phone?: string;
  plan?: Plan;
  seatsCount?: number;
  settings?: Partial<SalonSettings>;
}

/**
 * スタッフエンティティ
 */
export interface Staff {
  readonly id: StaffId;
  readonly salonId: SalonId;
  readonly email: string;
  readonly name: string;
  readonly role: StaffRole;
  readonly avatarUrl: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateStaffParams {
  salonId: SalonId;
  email: string;
  name: string;
  role?: StaffRole;
  avatarUrl?: string;
}

/**
 * セッションエンティティ
 */
export interface Session {
  readonly id: SessionId;
  readonly salonId: SalonId;
  readonly stylistId: StaffId;
  readonly status: SessionStatus;
  readonly customerInfo: CustomerInfo | null;
  readonly startedAt: Date;
  readonly endedAt: Date | null;
  readonly totalDurationMs: number | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateSessionParams {
  salonId: SalonId;
  stylistId: StaffId;
  customerInfo?: CustomerInfo;
}

export interface EndSessionParams {
  sessionId: SessionId;
  endedAt?: Date;
}

/**
 * 話者セグメントエンティティ
 */
export interface SpeakerSegment {
  readonly id: SegmentId;
  readonly sessionId: SessionId;
  readonly chunkIndex: number;
  readonly speaker: SpeakerType;
  readonly text: string;
  readonly startTimeMs: number;
  readonly endTimeMs: number;
  readonly confidence: number;
  readonly createdAt: Date;
}

export interface CreateSpeakerSegmentParams {
  sessionId: SessionId;
  chunkIndex: number;
  speaker: SpeakerType;
  text: string;
  startTimeMs: number;
  endTimeMs: number;
  confidence?: number;
}

/**
 * 分析結果エンティティ
 */
export interface AnalysisResult {
  readonly id: AnalysisId;
  readonly sessionId: SessionId;
  readonly chunkIndex: number;
  readonly overallScore: number;
  readonly metrics: AnalysisMetrics;
  readonly suggestions: string[];
  readonly highlights: string[];
  readonly createdAt: Date;
}

export interface CreateAnalysisResultParams {
  sessionId: SessionId;
  chunkIndex: number;
  overallScore: number;
  metrics: AnalysisMetrics;
  suggestions?: string[];
  highlights?: string[];
}

/**
 * 成功事例エンティティ
 * DBスキーマ: success_cases
 */
export interface SuccessCase {
  readonly id: SuccessCaseId;
  readonly salonId: SalonId;
  readonly sessionId: SessionId | null;
  readonly stylistId: StaffId | null;
  readonly concernKeywords: string[];
  readonly customerProfile: Record<string, unknown> | null;
  readonly approachText: string;
  readonly successfulTalk: string | null;
  readonly keyTactics: string[] | null;
  readonly result: string;
  readonly soldProduct: string | null;
  readonly conversionRate: number | null;
  readonly embedding: number[] | null;
  readonly isActive: boolean;
  readonly isPublic: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateSuccessCaseParams {
  salonId: SalonId;
  sessionId?: SessionId;
  stylistId?: StaffId;
  concernKeywords: string[];
  customerProfile?: Record<string, unknown>;
  approachText: string;
  successfulTalk?: string;
  keyTactics?: string[];
  result: string;
  soldProduct?: string;
  conversionRate?: number;
  isActive?: boolean;
  isPublic?: boolean;
}

/**
 * レポートエンティティ
 */
export interface Report {
  readonly id: ReportId;
  readonly sessionId: SessionId;
  readonly summary: string;
  readonly overallScore: number;
  readonly metrics: AnalysisMetrics;
  readonly improvements: string[];
  readonly strengths: string[];
  readonly comparisonWithAverage: MetricComparison[];
  readonly matchedSuccessCases: SuccessCaseMatch[];
  readonly generatedAt: Date;
}

export interface MetricComparison {
  readonly metricName: string;
  readonly score: number;
  readonly averageScore: number;
  readonly percentile: number;
}

export interface SuccessCaseMatch {
  readonly successCaseId: SuccessCaseId;
  readonly similarity: number;
  readonly approachText: string;
}

export interface GenerateReportParams {
  sessionId: SessionId;
}

/**
 * トレーニングシナリオエンティティ
 */
export interface TrainingScenario {
  readonly id: string;
  readonly salonId: SalonId | null; // nullの場合はシステム共通
  readonly title: string;
  readonly description: string;
  readonly customerPersona: CustomerPersona;
  readonly objectives: string[];
  readonly difficulty: 'beginner' | 'intermediate' | 'advanced';
  readonly estimatedMinutes: number;
  readonly isActive: boolean;
  readonly createdAt: Date;
}

export interface CustomerPersona {
  readonly name: string;
  readonly ageGroup: string;
  readonly gender: string;
  readonly hairConcerns: string[];
  readonly personality: string;
  readonly purchaseHistory: string[];
}

/**
 * ロールプレイセッションエンティティ
 */
export interface RoleplaySession {
  readonly id: string;
  readonly staffId: StaffId;
  readonly scenarioId: string;
  readonly status: 'in_progress' | 'completed' | 'abandoned';
  readonly messages: RoleplayMessage[];
  readonly evaluation: RoleplayEvaluation | null;
  readonly startedAt: Date;
  readonly endedAt: Date | null;
}

export interface RoleplayMessage {
  readonly role: 'customer' | 'stylist';
  readonly content: string;
  readonly timestamp: Date;
}

export interface RoleplayEvaluation {
  readonly overallScore: number;
  readonly metrics: Partial<AnalysisMetrics>;
  readonly feedback: string;
  readonly improvements: string[];
}

/**
 * トランスクリプトエンティティ（音声認識結果）
 * 注: speakerLabelはDBスキーマに存在しないため削除（2025-12-05）
 * 話者情報はspeaker_segmentsテーブルで管理
 */
export interface Transcript {
  readonly id: TranscriptId;
  readonly sessionId: SessionId;
  readonly chunkIndex: number;
  readonly text: string;
  readonly startTimeMs: number;
  readonly endTimeMs: number;
  readonly audioUrl: string | null;
  readonly confidence: number;
  readonly createdAt: Date;
}

export interface CreateTranscriptParams {
  sessionId: SessionId;
  chunkIndex: number;
  text: string;
  startTimeMs: number;
  endTimeMs: number;
  audioUrl?: string;
  confidence?: number;
}

/**
 * 話者セグメントエンティティ（話者分離後）
 */
export interface DiarizedSpeakerSegment {
  readonly id: SpeakerSegmentId;
  readonly sessionId: SessionId;
  readonly chunkIndex: number;
  readonly speakerLabel: SpeakerLabel;
  readonly speaker: SpeakerType;
  readonly text: string;
  readonly startTimeMs: number;
  readonly endTimeMs: number;
  readonly confidence: number;
  readonly createdAt: Date;
}

export interface CreateDiarizedSegmentParams {
  sessionId: SessionId;
  chunkIndex: number;
  speakerLabel: SpeakerLabel;
  speaker: SpeakerType;
  text: string;
  startTimeMs: number;
  endTimeMs: number;
  confidence?: number;
}

/**
 * セッション分析エンティティ（7指標詳細）
 */
export interface SessionAnalysis {
  readonly id: SessionAnalysisId;
  readonly sessionId: SessionId;
  readonly chunkIndex: number;
  readonly overallScore: number;

  // 7指標の個別スコア
  readonly talkRatioScore: number;
  readonly talkRatioDetail: TalkRatioDetail;
  readonly questionScore: number;
  readonly questionDetail: QuestionDetail;
  readonly emotionScore: number;
  readonly emotionDetail: EmotionDetail;
  readonly concernKeywordsScore: number;
  readonly concernKeywordsDetail: ConcernKeywordsDetail;
  readonly proposalTimingScore: number;
  readonly proposalTimingDetail: ProposalTimingDetail;
  readonly proposalQualityScore: number;
  readonly proposalQualityDetail: ProposalQualityDetail;
  readonly conversionScore: number;
  readonly conversionDetail: ConversionDetail;

  readonly suggestions: string[];
  readonly highlights: string[];
  readonly createdAt: Date;
}

export interface TalkRatioDetail {
  readonly stylistRatio: number;
  readonly customerRatio: number;
  readonly details: string;
}

export interface QuestionDetail {
  readonly openCount: number;
  readonly closedCount: number;
  readonly details: string;
}

export interface EmotionDetail {
  readonly positiveRatio: number;
  readonly details: string;
}

export interface ConcernKeywordsDetail {
  readonly keywords: string[];
  readonly details: string;
}

export interface ProposalTimingDetail {
  readonly timingMs: number | null;
  readonly details: string;
}

export interface ProposalQualityDetail {
  readonly matchRate: number;
  readonly details: string;
}

export interface ConversionDetail {
  readonly isConverted: boolean;
  readonly details: string;
}

/**
 * セッションレポートエンティティ
 */
export interface SessionReport {
  readonly id: SessionReportId;
  readonly sessionId: SessionId;
  readonly summary: string;
  readonly overallScore: number;
  readonly metrics: AnalysisMetrics;

  // 詳細データ
  readonly stylistRatio: number | null;
  readonly customerRatio: number | null;
  readonly openQuestionCount: number;
  readonly closedQuestionCount: number;
  readonly positiveRatio: number | null;
  readonly concernKeywords: string[];
  readonly proposalTimingMs: number | null;
  readonly proposalMatchRate: number | null;
  readonly isConverted: boolean;

  // フィードバック
  readonly improvements: string[];
  readonly strengths: string[];

  // マッチした成功事例
  readonly matchedCases: MatchedSuccessCase[];

  readonly generatedAt: Date;
}

export interface MatchedSuccessCase {
  readonly caseId: SuccessCaseId;
  readonly similarity: number;
  readonly approachText: string;
  readonly concernKeywords: string[];
}

/**
 * プッシュトークンエンティティ
 */
export interface PushToken {
  readonly id: PushTokenId;
  readonly staffId: StaffId;
  readonly token: string;
  readonly platform: Platform;
  readonly deviceId: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreatePushTokenParams {
  staffId: StaffId;
  token: string;
  platform: Platform;
  deviceId?: string;
}

/**
 * 通知ログエンティティ
 */
export interface NotificationLog {
  readonly id: NotificationId;
  readonly staffId: StaffId;
  readonly type: NotificationType;
  readonly title: string;
  readonly body: string;
  readonly data: Record<string, unknown>;
  readonly status: NotificationStatus;
  readonly sentAt: Date;
  readonly readAt: Date | null;
}

export interface CreateNotificationLogParams {
  staffId: StaffId;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * スタッフトレーニング統計エンティティ
 */
export interface StaffTrainingStats {
  readonly id: string;
  readonly staffId: StaffId;
  readonly totalTrainingCount: number;
  readonly totalScoreSum: number;
  readonly averageScore: number;
  readonly highestScore: number;
  readonly lastTrainingAt: Date | null;
  readonly updatedAt: Date;
}

/**
 * スタッフ統計（get_staff_statistics関数の戻り値）
 */
export interface StaffStatistics {
  readonly staffId: StaffId;
  readonly staffName: string;
  readonly salonName: string;

  // セッション統計
  readonly totalSessions: number;
  readonly completedSessions: number;
  readonly totalDurationHours: number;
  readonly avgSessionDurationMinutes: number;

  // スコア統計
  readonly avgOverallScore: number;
  readonly avgTalkRatioScore: number;
  readonly avgQuestionScore: number;
  readonly avgEmotionScore: number;
  readonly avgConcernKeywordsScore: number;
  readonly avgProposalTimingScore: number;
  readonly avgProposalQualityScore: number;
  readonly avgConversionScore: number;

  // 成約統計
  readonly conversionCount: number;
  readonly conversionRate: number;

  // トレーニング統計
  readonly trainingCount: number;
  readonly avgTrainingScore: number;

  // トレンド
  readonly scoreTrend: WeeklyScoreTrend[];

  // 期間
  readonly periodStart: Date;
  readonly periodEnd: Date;
}

export interface WeeklyScoreTrend {
  readonly week: Date;
  readonly score: number;
}

/**
 * 店舗統計（get_salon_statistics関数の戻り値）
 */
export interface SalonStatistics {
  readonly salonId: SalonId;
  readonly salonName: string;

  // スタッフ統計
  readonly totalStaff: number;
  readonly activeStaff: number;

  // セッション統計
  readonly totalSessions: number;
  readonly completedSessions: number;
  readonly avgSessionsPerStaff: number;

  // スコア統計
  readonly avgOverallScore: number;

  // 成約統計
  readonly conversionCount: number;
  readonly conversionRate: number;

  // トレーニング統計
  readonly totalTrainingCount: number;
  readonly avgTrainingScore: number;

  // トップパフォーマー
  readonly topPerformers: TopPerformer[];

  // 期間
  readonly periodStart: Date;
  readonly periodEnd: Date;
}

export interface TopPerformer {
  readonly id: StaffId;
  readonly name: string;
  readonly avgScore: number;
  readonly sessionCount: number;
}
