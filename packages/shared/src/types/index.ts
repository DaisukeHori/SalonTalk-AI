/**
 * Shared Types
 * 共有型定義
 */

import type { SessionId, SalonId, StaffId } from '../domain/valueObjects';
import type { SpeakerSegment, AnalysisResult } from '../domain/entities';

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
  hasNext: boolean;
  nextCursor?: string;
}

// ===========================================
// Session API Types
// ===========================================

export interface CreateSessionRequest {
  stylistId: string;
  customerInfo?: {
    name?: string;
    ageGroup?: string;
    gender?: string;
    visitType: 'new' | 'repeat';
    notes?: string;
  };
}

export interface CreateSessionResponse {
  sessionId: string;
  status: 'recording';
  realtimeChannel: string;
  startedAt: string;
}

export interface EndSessionRequest {
  sessionId: string;
}

export interface EndSessionResponse {
  sessionId: string;
  status: 'processing';
  endedAt: string;
  totalDurationMs: number;
}

// ===========================================
// Transcription API Types
// ===========================================

export interface ProcessTranscriptionRequest {
  sessionId: string;
  chunkIndex: number;
  audioUrl: string;
  transcription: TranscriptionChunk;
}

export interface TranscriptionChunk {
  text: string;
  startTimeMs: number;
  endTimeMs: number;
  words: TranscriptionWord[];
}

export interface TranscriptionWord {
  word: string;
  startTimeMs: number;
  endTimeMs: number;
  confidence: number;
}

export interface ProcessTranscriptionResponse {
  success: boolean;
  segmentCount: number;
}

// ===========================================
// Diarization API Types
// ===========================================

export interface DiarizationRequest {
  sessionId: string;
  chunkIndex: number;
  audioUrl: string;
  transcription: TranscriptionChunk;
}

export interface DiarizationResult {
  sessionId: string;
  chunkIndex: number;
  segments: DiarizationSegment[];
  processingTimeMs: number;
}

export interface DiarizationSegment {
  speaker: 'SPEAKER_00' | 'SPEAKER_01';
  startTimeMs: number;
  endTimeMs: number;
  text: string;
}

export interface DiarizationCallbackRequest {
  sessionId: string;
  chunkIndex: number;
  success: boolean;
  result?: DiarizationResult;
  error?: string;
}

// ===========================================
// Analysis API Types
// ===========================================

export interface AnalyzeConversationRequest {
  sessionId: string;
  chunkIndex: number;
  segments: Array<{
    speaker: 'stylist' | 'customer';
    text: string;
    startTimeMs: number;
    endTimeMs: number;
  }>;
}

export interface AnalyzeConversationResponse {
  overallScore: number;
  metrics: {
    talkRatio: MetricResult;
    questionQuality: MetricResult;
    emotion: MetricResult;
    concernKeywords: MetricResult;
    proposalTiming: MetricResult;
    proposalQuality: MetricResult;
    conversion: MetricResult;
  };
  suggestions: string[];
  matchedSuccessCases: SuccessCaseMatch[];
}

export interface MetricResult {
  score: number;
  details: string;
  data?: Record<string, unknown>;
}

export interface SuccessCaseMatch {
  id: string;
  similarity: number;
  approachText: string;
  concernKeywords: string[];
}

// ===========================================
// Report API Types
// ===========================================

export interface GenerateReportRequest {
  sessionId: string;
}

export interface GenerateReportResponse {
  reportId: string;
  summary: string;
  overallScore: number;
  improvements: string[];
  strengths: string[];
  generatedAt: string;
}

// ===========================================
// Success Case API Types
// ===========================================

export interface SearchSuccessCasesRequest {
  concernKeywords: string[];
  limit?: number;
  threshold?: number;
}

export interface SearchSuccessCasesResponse {
  cases: SuccessCaseMatch[];
  total: number;
}

// ===========================================
// Realtime Event Types
// ===========================================

export interface RealtimeScoreUpdate {
  sessionId: string;
  chunkIndex: number;
  overallScore: number;
  metrics: {
    talkRatio: number;
    questionQuality: number;
    emotion: number;
  };
  timestamp: string;
}

export interface RealtimeProposalTiming {
  sessionId: string;
  concernDetected: string;
  suggestion: string;
  urgency: 'low' | 'medium' | 'high';
  timestamp: string;
}

export interface RealtimeSuccessCaseSuggestion {
  sessionId: string;
  concernKeywords: string[];
  successCase: SuccessCaseMatch;
  timestamp: string;
}

// ===========================================
// Training/Roleplay Types
// ===========================================

export interface RoleplayMessageRequest {
  sessionId: string;
  message: string;
}

export interface RoleplayMessageResponse {
  customerResponse: string;
  hints?: string[];
  currentScore?: number;
}

export interface RoleplayEndRequest {
  sessionId: string;
}

export interface RoleplayEndResponse {
  evaluation: {
    overallScore: number;
    feedback: string;
    improvements: string[];
  };
}
