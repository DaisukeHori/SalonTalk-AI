/**
 * @salontalk/shared
 * SalonTalk AI shared types, domain models, and utilities
 */

// Domain exports (primary source for domain types)
export * from './domain';

// Infrastructure exports
export * from './infrastructure';

// Type exports (API types - note: SuccessCaseMatch is renamed to ApiSuccessCaseMatch to avoid conflict with domain)
export * from './types';

// Constants exports - avoiding duplicates with domain/valueObjects (METRIC_WEIGHTS, EMBEDDING_DIMENSION)
export {
  AUDIO_CHUNK_DURATION_SECONDS,
  AUDIO_CHUNK_DURATION_MS,
  SUPPORTED_AUDIO_FORMATS,
  AUDIO_SAMPLE_RATE,
  IDEAL_TALK_RATIO,
  IDEAL_OPEN_QUESTION_RATIO,
  IDEAL_POSITIVE_EMOTION_RATIO,
  IDEAL_CONCERN_KEYWORD_COUNT,
  IDEAL_PROPOSAL_TIMING_MS,
  SESSION_TIMEOUT_MS,
  MAX_CONCURRENT_SESSIONS,
  API_TIMEOUT_MS,
  API_RETRY_COUNT,
  API_RETRY_DELAY_MS,
  VECTOR_SEARCH_THRESHOLD,
  VECTOR_SEARCH_DEFAULT_LIMIT,
  CONCERN_KEYWORD_PATTERNS,
  ERROR_CODES,
  PLAN_FEATURES,
  type ErrorCode,
} from './constants';

// Utils exports
export * from './utils';

// Errors exports (excludes ErrorCode to avoid conflict with constants)
export {
  ErrorCodes,
  type ErrorDefinition,
  getErrorDefinition,
  isErrorCode,
  AppError,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  AIError,
  DiarizationError,
  DatabaseError,
  NetworkError,
  isRetryableError,
  toAppError,
  createErrorResponse,
  handleClientError,
  withErrorHandling,
  reportError,
  getGlobalErrorHandler,
  setupGlobalErrorHandlers,
  type ClientErrorResult,
  withRetry,
  withPresetRetry,
  retryPresets,
  type RetryOptions,
} from './errors';
