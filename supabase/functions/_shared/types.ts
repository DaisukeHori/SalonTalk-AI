/**
 * Shared Types for Edge Functions
 *
 * 方針: Supabase生成型と同じsnake_caseを使用
 * 詳細は docs/詳細設計書/12-付録.md を参照
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
  salon_id: string;
  stylist_id: string;
  status: SessionStatus;
  started_at: string;
  ended_at: string | null;
  total_duration_ms: number | null;
}

// ===========================================
// Analysis Types
// ===========================================

export interface AnalysisMetricScore {
  score: number;
  details: string;
}

export interface TalkRatioMetric extends AnalysisMetricScore {
  stylist_ratio: number;
  customer_ratio: number;
}

export interface QuestionMetric extends AnalysisMetricScore {
  open_count: number;
  closed_count: number;
}

export interface EmotionMetric extends AnalysisMetricScore {
  positive_ratio: number;
}

export interface ConcernKeywordsMetric extends AnalysisMetricScore {
  keywords: string[];
}

export interface ProposalTimingMetric extends AnalysisMetricScore {
  timing_ms: number | null;
}

export interface ProposalQualityMetric extends AnalysisMetricScore {
  match_rate: number;
}

export interface ConversionMetric extends AnalysisMetricScore {
  is_converted: boolean;
}

export interface AnalysisMetrics {
  talk_ratio: TalkRatioMetric;
  question_quality: QuestionMetric;
  emotion: EmotionMetric;
  concern_keywords: ConcernKeywordsMetric;
  proposal_timing: ProposalTimingMetric;
  proposal_quality: ProposalQualityMetric;
  conversion: ConversionMetric;
}

export interface AnalysisResult {
  overall_score: number;
  metrics: AnalysisMetrics;
  suggestions: string[];
  highlights: string[];
}

// ===========================================
// Transcript Types
// ===========================================

export interface TranscriptSegment {
  id: string;
  session_id: string;
  chunk_index: number;
  text: string;
  start_time_ms: number;
  end_time_ms: number;
  confidence: number;
  speaker_label?: string;
}

export interface SpeakerSegment {
  id: string;
  session_id: string;
  chunk_index: number;
  speaker_label: string;
  start_time_ms: number;
  end_time_ms: number;
  confidence: number;
}

export interface MergedSegment {
  speaker: 'stylist' | 'customer' | 'unknown';
  speaker_label: string;
  text: string;
  start_time_ms: number;
  end_time_ms: number;
  confidence: number;
}

// ===========================================
// Diarization Types
// ===========================================

export interface DiarizationSegment {
  speaker: string;
  start_time_ms: number;
  end_time_ms: number;
}

export interface DiarizationResult {
  session_id: string;
  chunk_index: number;
  segments: DiarizationSegment[];
  processing_time_ms: number;
}

// ===========================================
// Success Case Types
// ===========================================

export interface SuccessCase {
  id: string;
  salon_id: string;
  session_id: string | null;
  concern_keywords: string[];
  approach_text: string;
  result: string;
  conversion_rate: number | null;
  embedding: number[] | null;
}

export interface SuccessCaseMatch {
  id: string;
  similarity: number;
  approach_text: string;
  concern_keywords: string[];
}

// ===========================================
// Report Types
// ===========================================

export interface ReportMetrics {
  talk_ratio: TalkRatioMetric;
  question_quality: QuestionMetric;
  emotion: EmotionMetric;
  concern_keywords: ConcernKeywordsMetric;
  proposal_timing: ProposalTimingMetric;
  proposal_quality: ProposalQualityMetric;
  conversion: ConversionMetric;
}

export interface SessionReport {
  id: string;
  session_id: string;
  summary: string;
  overall_score: number;
  metrics: ReportMetrics;
  improvements: string[];
  strengths: string[];
  matched_cases: SuccessCaseMatch[];
  generated_at: string;
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
  age_group: string;
  gender: string;
  hair_concerns: string[];
  personality: string;
  purchase_history: string[];
}

export interface TrainingScenario {
  id: string;
  title: string;
  description: string;
  customer_persona: CustomerPersona;
  objectives: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface RoleplayEvaluation {
  overall_score: number;
  metrics: Partial<AnalysisMetrics>;
  feedback: string;
  improvements: string[];
  model_answers: Array<{
    situation: string;
    stylist_response: string;
    model_answer: string;
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
  talk_ratio: 0.15,
  question_quality: 0.15,
  emotion: 0.15,
  concern_keywords: 0.10,
  proposal_timing: 0.15,
  proposal_quality: 0.15,
  conversion: 0.15,
} as const;

/**
 * Calculate weighted overall score
 */
export function calculateWeightedScore(metrics: AnalysisMetrics): number {
  const score =
    metrics.talk_ratio.score * METRIC_WEIGHTS.talk_ratio +
    metrics.question_quality.score * METRIC_WEIGHTS.question_quality +
    metrics.emotion.score * METRIC_WEIGHTS.emotion +
    metrics.concern_keywords.score * METRIC_WEIGHTS.concern_keywords +
    metrics.proposal_timing.score * METRIC_WEIGHTS.proposal_timing +
    metrics.proposal_quality.score * METRIC_WEIGHTS.proposal_quality +
    metrics.conversion.score * METRIC_WEIGHTS.conversion;

  return Math.round(score);
}
