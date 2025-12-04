/**
 * Services Index
 * Export all service instances
 */

export { audioRecorderService, AudioRecorderService } from './AudioRecorderService';
export type { AudioChunk, RecordingState, RecordingEvent, RecordingEventListener } from './AudioRecorderService';

export { speechRecognitionService, SpeechRecognitionService } from './SpeechRecognitionService';
export type { TranscriptSegment, TranscriptChunk, SpeechEvent, SpeechEventListener } from './SpeechRecognitionService';

export { realtimeService, RealtimeService } from './RealtimeService';
export type { AnalysisUpdate, NotificationPayload, RealtimeEvent, RealtimeEventListener } from './RealtimeService';

export { apiService, ApiService } from './ApiService';
export type {
  CreateSessionRequest,
  CreateSessionResponse,
  ProcessAudioRequest,
  ProcessAudioResponse,
  EndSessionRequest,
  EndSessionResponse,
  GenerateReportResponse,
  ApiError,
  RoleplayMessage,
  RoleplayChatRequest,
  RoleplayChatResponse,
  RoleplayEvaluation,
  EvaluateRoleplayRequest,
  RoleplayEvaluationResult,
  ReportData,
} from './ApiService';
