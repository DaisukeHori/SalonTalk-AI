/**
 * Shared Types for Edge Functions
 */

// ===========================================
// Common Types
// ===========================================

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ===========================================
// Session Types
// ===========================================

export type SessionStatus = 'recording' | 'processing' | 'analyzing' | 'completed' | 'error';

export interface SessionInfo {
  id: string;
  salonId: string;
  stylistId: string;
  status: SessionStatus;
  startedAt: string;
  endedAt: string | null;
  totalDurationMs: number | null;
}

// ===========================================
// Analysis Types
// ===========================================

export interface AnalysisMetricScore {
  score: number;
  details: string;
}

export interface TalkRatioMetric extends AnalysisMetricScore {
  stylistRatio: number;
  customerRatio: number;
}

export interface QuestionMetric extends AnalysisMetricScore {
  openCount: number;
  closedCount: number;
}

export interface EmotionMetric extends AnalysisMetricScore {
  positiveRatio: number;
}

export interface ConcernKeywordsMetric extends AnalysisMetricScore {
  keywords: string[];
}

export interface ProposalTimingMetric extends AnalysisMetricScore {
  timingMs: number | null;
}

export interface ProposalQualityMetric extends AnalysisMetricScore {
  matchRate: number;
}

export interface ConversionMetric extends AnalysisMetricScore {
  isConverted: boolean;
}

export interface AnalysisMetrics {
  talkRatio: TalkRatioMetric;
  questionQuality: QuestionMetric;
  emotion: EmotionMetric;
  concernKeywords: ConcernKeywordsMetric;
  proposalTiming: ProposalTimingMetric;
  proposalQuality: ProposalQualityMetric;
  conversion: ConversionMetric;
}

export interface AnalysisResult {
  overallScore: number;
  metrics: AnalysisMetrics;
  suggestions: string[];
  highlights: string[];
}

// ===========================================
// Transcript Types
// ===========================================

export interface TranscriptSegment {
  id: string;
  sessionId: string;
  chunkIndex: number;
  text: string;
  startTimeMs: number;
  endTimeMs: number;
  confidence: number;
  speakerLabel?: string;
}

export interface SpeakerSegment {
  id: string;
  sessionId: string;
  chunkIndex: number;
  speakerLabel: string;
  startTimeMs: number;
  endTimeMs: number;
  confidence: number;
}

export interface MergedSegment {
  speaker: 'stylist' | 'customer' | 'unknown';
  speakerLabel: string;
  text: string;
  startTimeMs: number;
  endTimeMs: number;
  confidence: number;
}

// ===========================================
// Diarization Types
// ===========================================

export interface DiarizationSegment {
  speaker: string;
  startTimeMs: number;
  endTimeMs: number;
}

export interface DiarizationResult {
  sessionId: string;
  chunkIndex: number;
  segments: DiarizationSegment[];
  processingTimeMs: number;
}

// ===========================================
// Success Case Types
// ===========================================

export interface SuccessCase {
  id: string;
  salonId: string;
  sessionId: string | null;
  concernKeywords: string[];
  approachText: string;
  result: string;
  conversionRate: number | null;
  embedding: number[] | null;
}

export interface SuccessCaseMatch {
  id: string;
  similarity: number;
  approachText: string;
  concernKeywords: string[];
}

// ===========================================
// Report Types
// ===========================================

export interface ReportMetrics {
  talkRatio: TalkRatioMetric;
  questionQuality: QuestionMetric;
  emotion: EmotionMetric;
  concernKeywords: ConcernKeywordsMetric;
  proposalTiming: ProposalTimingMetric;
  proposalQuality: ProposalQualityMetric;
  conversion: ConversionMetric;
}

export interface SessionReport {
  id: string;
  sessionId: string;
  summary: string;
  overallScore: number;
  metrics: ReportMetrics;
  improvements: string[];
  strengths: string[];
  matchedCases: SuccessCaseMatch[];
  generatedAt: string;
}

// ===========================================
// Roleplay Types
// ===========================================

export interface RoleplayMessage {
  role: 'customer' | 'stylist';
  content: string;
  timestamp: string;
}

export interface CustomerPersona {
  name: string;
  ageGroup: string;
  gender: string;
  hairConcerns: string[];
  personality: string;
  purchaseHistory: string[];
}

export interface TrainingScenario {
  id: string;
  title: string;
  description: string;
  customerPersona: CustomerPersona;
  objectives: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface RoleplayEvaluation {
  overallScore: number;
  metrics: Partial<AnalysisMetrics>;
  feedback: string;
  improvements: string[];
  modelAnswers: Array<{
    situation: string;
    stylistResponse: string;
    modelAnswer: string;
    reasoning: string;
  }>;
}

// ===========================================
// Notification Types
// ===========================================

export type NotificationType =
  | 'session_complete'
  | 'training_reminder'
  | 'score_alert'
  | 'success_case'
  | 'custom';

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

// ===========================================
// Metric Weights
// ===========================================

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
 * Calculate weighted overall score
 */
export function calculateWeightedScore(metrics: AnalysisMetrics): number {
  const score =
    metrics.talkRatio.score * METRIC_WEIGHTS.talkRatio +
    metrics.questionQuality.score * METRIC_WEIGHTS.questionQuality +
    metrics.emotion.score * METRIC_WEIGHTS.emotion +
    metrics.concernKeywords.score * METRIC_WEIGHTS.concernKeywords +
    metrics.proposalTiming.score * METRIC_WEIGHTS.proposalTiming +
    metrics.proposalQuality.score * METRIC_WEIGHTS.proposalQuality +
    metrics.conversion.score * METRIC_WEIGHTS.conversion;

  return Math.round(score);
}
