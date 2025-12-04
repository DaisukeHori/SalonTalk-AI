/**
 * Domain Entities
 * ドメインエンティティ定義
 */

import type {
  SalonId,
  StaffId,
  SessionId,
  SegmentId,
  AnalysisId,
  SuccessCaseId,
  ReportId,
  Plan,
  StaffRole,
  SessionStatus,
  SpeakerType,
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
 */
export interface SuccessCase {
  readonly id: SuccessCaseId;
  readonly salonId: SalonId;
  readonly sessionId: SessionId | null;
  readonly concernKeywords: string[];
  readonly approachText: string;
  readonly result: string;
  readonly conversionRate: number | null;
  readonly embedding: number[] | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateSuccessCaseParams {
  salonId: SalonId;
  sessionId?: SessionId;
  concernKeywords: string[];
  approachText: string;
  result: string;
  conversionRate?: number;
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
