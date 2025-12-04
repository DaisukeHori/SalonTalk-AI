/**
 * Error Handlers
 * エラーハンドラー
 *
 * Based on 詳細設計書 10.3 グローバルエラーハンドラー
 */

import { AppError, toAppError } from './AppError';

/**
 * Edge Function用エラーレスポンス生成
 */
export function createErrorResponse(error: unknown): {
  body: string;
  status: number;
  headers: Record<string, string>;
} {
  console.error('Edge Function Error:', error);

  const appError = toAppError(error);

  return {
    body: JSON.stringify(appError.toJSON()),
    status: appError.httpStatus,
    headers: { 'Content-Type': 'application/json' },
  };
}

/**
 * クライアント用エラーハンドラー
 * React Native / Web共通
 */
export interface ClientErrorResult {
  code: string;
  message: string;
  isRetryable: boolean;
  userMessage: string;
}

export function handleClientError(error: unknown): ClientErrorResult {
  const appError = toAppError(error);

  return {
    code: appError.code,
    message: appError.message,
    isRetryable: appError.isRetryable(),
    userMessage: getClientFriendlyMessage(appError),
  };
}

/**
 * ユーザーフレンドリーなメッセージを生成
 */
function getClientFriendlyMessage(error: AppError): string {
  // コードに基づいてカスタムメッセージを返す
  const friendlyMessages: Record<string, string> = {
    AUTH_001: 'ログインが必要です。再度ログインしてください。',
    AUTH_002: 'ログインセッションが切れました。再度ログインしてください。',
    AUTH_003: 'この操作を行う権限がありません。',
    AUTH_004: 'アカウントが無効になっています。管理者にお問い合わせください。',
    NET_001: 'インターネット接続を確認してください。',
    NET_002: '通信がタイムアウトしました。再度お試しください。',
    AI_002: 'サーバーが混雑しています。しばらく待ってから再度お試しください。',
  };

  return friendlyMessages[error.code] || error.message;
}

/**
 * 非同期操作のエラーラッパー
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<{ success: true; data: T } | { success: false; error: ClientErrorResult }> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    console.error(`Error in ${context || 'operation'}:`, error);
    return { success: false, error: handleClientError(error) };
  }
}

/**
 * エラーログ送信（将来の拡張用）
 */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  const appError = toAppError(error);

  // ログ出力
  console.error('Error Report:', {
    ...appError.toLogObject(),
    context,
  });

  // 将来的にはSentryなどの外部サービスに送信
  // Sentry.captureException(error, { extra: context });
}

/**
 * グローバルエラーバウンダリ用ハンドラー
 */
export function getGlobalErrorHandler(): (error: Error, errorInfo: unknown) => void {
  return (error: Error, errorInfo: unknown) => {
    reportError(error, {
      errorInfo,
      type: 'global_boundary',
    });
  };
}

/**
 * Promise rejection用グローバルハンドラー
 * Browser-specific: may not work in Node.js/Deno environments
 */
// Declare window for non-DOM environments
declare const window: { addEventListener?: (type: string, handler: (event: unknown) => void) => void } | undefined;

export function setupGlobalErrorHandlers(): void {
  // Only run in browser environment with proper window check
  // Using type declaration to avoid DOM lib dependency
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const win = typeof window !== 'undefined' ? window : null;

  if (win && typeof win.addEventListener === 'function') {
    // Unhandled promise rejection handler
    win.addEventListener('unhandledrejection', (event: unknown) => {
      const e = event as { reason?: unknown };
      reportError(e.reason, {
        type: 'unhandled_rejection',
      });
    });

    // Global error handler
    win.addEventListener('error', (event: unknown) => {
      const e = event as { error?: Error; filename?: string; lineno?: number; colno?: number };
      reportError(e.error, {
        type: 'global_error',
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
      });
    });
  }
}
