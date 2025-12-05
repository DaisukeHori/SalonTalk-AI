/**
 * Errors Module
 * エラー処理モジュール
 *
 * Based on 詳細設計書 Chapter 10
 */

// Error codes
export { ErrorCodes, type ErrorCode, type ErrorDefinition, getErrorDefinition, isErrorCode } from './errorCodes';

// Error classes
export {
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
} from './AppError';

// Error handlers
export {
  createErrorResponse,
  handleClientError,
  withErrorHandling,
  reportError,
  getGlobalErrorHandler,
  setupGlobalErrorHandlers,
  type ClientErrorResult,
} from './errorHandler';

// Retry utilities
export {
  withRetry,
  withPresetRetry,
  retryPresets,
  type RetryOptions,
} from './retry';
