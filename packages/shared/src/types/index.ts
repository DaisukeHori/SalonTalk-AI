/**
 * Shared Types
 * 共有型定義
 *
 * 方針: Supabase生成型と同じsnake_caseを使用
 * 詳細は docs/詳細設計書/12-付録.md を参照
 */

// Note: Importing from domain but using through main exports to avoid duplication
// These types are re-exported from domain module

// ===========================================
// API Request/Response Types
// ===========================================

/**
 * API共通レスポンス
 */
export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * ページネーション
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  has_next: boolean;
  next_cursor?: string;
}

// ===========================================
// Session API Types
// ===========================================

export interface CreateSessionRequest {
  stylist_id: string;
  customer_info?: {
    name?: string;
    age_group?: string;
    gender?: string;
    visit_type: 'new' | 'repeat';
    notes?: string;
  };
}

export interface CreateSessionResponse {
  session_id: string;
  status: 'recording';
  realtime_channel: string;
  started_at: string;
}

export interface EndSessionRequest {
  session_id: string;
}

export interface EndSessionResponse {
  session_id: string;
  status: 'processing';
  ended_at: string;
  total_duration_ms: number;
}

// ===========================================
// Transcription API Types
// ===========================================

export interface ProcessTranscriptionRequest {
  session_id: string;
  chunk_index: number;
  audio_url: string;
  transcription: TranscriptionChunk;
}

export interface TranscriptionChunk {
  text: string;
  start_time_ms: number;
  end_time_ms: number;
  words: TranscriptionWord[];
}

export interface TranscriptionWord {
  word: string;
  start_time_ms: number;
  end_time_ms: number;
  confidence: number;
}

export interface ProcessTranscriptionResponse {
  success: boolean;
  segment_count: number;
}

// ===========================================
// Diarization API Types
// ===========================================

export interface DiarizationRequest {
  session_id: string;
  chunk_index: number;
  audio_url: string;
  transcription: TranscriptionChunk;
}

export interface DiarizationResult {
  session_id: string;
  chunk_index: number;
  segments: DiarizationSegment[];
  processing_time_ms: number;
}

export interface DiarizationSegment {
  speaker: 'SPEAKER_00' | 'SPEAKER_01';
  start_time_ms: number;
  end_time_ms: number;
  text: string;
}

export interface DiarizationCallbackRequest {
  session_id: string;
  chunk_index: number;
  success: boolean;
  result?: DiarizationResult;
  error?: string;
}

// ===========================================
// Analysis API Types
// ===========================================

export interface AnalyzeConversationRequest {
  session_id: string;
  chunk_index: number;
  segments: Array<{
    speaker: 'stylist' | 'customer';
    text: string;
    start_time_ms: number;
    end_time_ms: number;
  }>;
}

export interface AnalyzeConversationResponse {
  overall_score: number;
  metrics: {
    talk_ratio: MetricResult;
    question_quality: MetricResult;
    emotion: MetricResult;
    concern_keywords: MetricResult;
    proposal_timing: MetricResult;
    proposal_quality: MetricResult;
    conversion: MetricResult;
  };
  suggestions: string[];
  matched_success_cases: ApiSuccessCaseMatch[];
}

export interface MetricResult {
  score: number;
  details: string;
  data?: Record<string, unknown>;
}

export interface ApiSuccessCaseMatch {
  id: string;
  similarity: number;
  approach_text: string;
  concern_keywords: string[];
}

// ===========================================
// Report API Types
// ===========================================

export interface GenerateReportRequest {
  session_id: string;
}

export interface GenerateReportResponse {
  report_id: string;
  summary: string;
  overall_score: number;
  improvements: string[];
  strengths: string[];
  generated_at: string;
}

// ===========================================
// Success Case API Types
// ===========================================

export interface SearchSuccessCasesRequest {
  concern_keywords: string[];
  limit?: number;
  threshold?: number;
}

export interface SearchSuccessCasesResponse {
  cases: ApiSuccessCaseMatch[];
  total: number;
}

// ===========================================
// Realtime Event Types
// ===========================================

export interface RealtimeScoreUpdate {
  session_id: string;
  chunk_index: number;
  overall_score: number;
  metrics: {
    talk_ratio: number;
    question_quality: number;
    emotion: number;
  };
  timestamp: string;
}

export interface RealtimeProposalTiming {
  session_id: string;
  concern_detected: string;
  suggestion: string;
  urgency: 'low' | 'medium' | 'high';
  timestamp: string;
}

export interface RealtimeSuccessCaseSuggestion {
  session_id: string;
  concern_keywords: string[];
  success_case: ApiSuccessCaseMatch;
  timestamp: string;
}

// ===========================================
// Training/Roleplay Types
// ===========================================

export interface RoleplayMessageRequest {
  session_id: string;
  message: string;
}

export interface RoleplayMessageResponse {
  customer_response: string;
  hints?: string[];
  current_score?: number;
}

export interface RoleplayEndRequest {
  session_id: string;
}

export interface RoleplayEndResponse {
  evaluation: {
    overall_score: number;
    feedback: string;
    improvements: string[];
  };
}
