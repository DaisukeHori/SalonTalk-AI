/**
 * Response Utilities for Edge Functions
 */
import { corsHeaders } from './cors.ts';

/**
 * Create JSON success response
 */
export function jsonResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify({ data, error: null }), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Create JSON error response
 */
export function errorResponse(
  code: string,
  message: string,
  status = 400,
  details?: Record<string, unknown>
): Response {
  return new Response(
    JSON.stringify({
      data: null,
      error: { code, message, details },
    }),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Create unauthorized response
 */
export function unauthorizedResponse(message = 'Unauthorized'): Response {
  return errorResponse('AUTH_001', message, 401);
}

/**
 * Create not found response
 */
export function notFoundResponse(message = 'Not found'): Response {
  return errorResponse('NOT_FOUND', message, 404);
}

/**
 * Create internal server error response
 */
export function serverErrorResponse(message = 'Internal server error'): Response {
  return errorResponse('INTERNAL_ERROR', message, 500);
}
