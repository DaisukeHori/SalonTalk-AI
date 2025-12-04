/**
 * Error Handling Utilities
 * エラーハンドリングユーティリティ
 */

/**
 * Base application error
 */
export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  toJSON() {
    return {
      error: {
        message: this.message,
        code: this.code,
        details: this.details,
      },
    };
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

/**
 * Validation error
 */
export class ValidationError extends AppError {
  public field?: string;

  constructor(message: string, field?: string) {
    super(message, 400, 'VALIDATION_ERROR', field ? { field } : undefined);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Conflict error (e.g., duplicate entry)
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends AppError {
  public retryAfter?: number;

  constructor(message: string = 'Too many requests', retryAfter?: number) {
    super(message, 429, 'RATE_LIMIT', retryAfter ? { retryAfter } : undefined);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * External service error
 */
export class ExternalServiceError extends AppError {
  public service: string;

  constructor(service: string, message: string = 'External service error') {
    super(message, 502, 'EXTERNAL_SERVICE_ERROR', { service });
    this.name = 'ExternalServiceError';
    this.service = service;
  }
}

/**
 * Database error
 */
export class DatabaseError extends AppError {
  constructor(message: string = 'Database error') {
    super(message, 500, 'DATABASE_ERROR');
    this.name = 'DatabaseError';
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends AppError {
  constructor(message: string = 'Operation timed out') {
    super(message, 504, 'TIMEOUT');
    this.name = 'TimeoutError';
  }
}

/**
 * Error handler for Edge Functions
 */
export function handleError(error: unknown): Response {
  console.error('Error:', error);

  if (error instanceof AppError) {
    return new Response(JSON.stringify(error.toJSON()), {
      status: error.statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  if (error instanceof Error) {
    return new Response(
      JSON.stringify({
        error: {
          message: error.message,
          code: 'INTERNAL_ERROR',
        },
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  return new Response(
    JSON.stringify({
      error: {
        message: 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
      },
    }),
    {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}

/**
 * Wrap async function with error handling
 */
export function withErrorHandler<T extends (...args: unknown[]) => Promise<Response>>(
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleError(error);
    }
  }) as T;
}

/**
 * Assert condition or throw error
 */
export function assert(condition: boolean, message: string, ErrorClass = AppError): void {
  if (!condition) {
    throw new ErrorClass(message);
  }
}

/**
 * Log error with context
 */
export function logError(error: unknown, context?: Record<string, unknown>): void {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    error:
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : error,
    context,
  };

  console.error(JSON.stringify(errorInfo, null, 2));
}
