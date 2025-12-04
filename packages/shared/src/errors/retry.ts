/**
 * Retry Utilities
 * リトライユーティリティ
 *
 * Based on 詳細設計書 10.4 リトライユーティリティ
 */

import { isRetryableError } from './AppError';

export interface RetryOptions {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
  jitter: boolean;
  retryCondition?: (error: unknown) => boolean;
  onRetry?: (attempt: number, error: unknown, delay: number) => void;
}

const defaultOptions: RetryOptions = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
  jitter: true,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * リトライ付き関数実行
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      // リトライ条件チェック
      const shouldRetry = opts.retryCondition
        ? opts.retryCondition(error)
        : isDefaultRetryable(error);

      if (!shouldRetry) {
        throw error;
      }

      // 最後の試行ならエラーをスロー
      if (attempt === opts.maxAttempts) {
        throw error;
      }

      // 遅延計算
      let delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffFactor, attempt - 1),
        opts.maxDelay
      );

      // ジッター追加（±20%のランダムな変動）
      if (opts.jitter) {
        delay += delay * (Math.random() * 0.4 - 0.2);
      }

      // コールバック
      opts.onRetry?.(attempt, error, delay);

      // 待機
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * デフォルトのリトライ可否判定
 */
function isDefaultRetryable(error: unknown): boolean {
  if (error instanceof Error) {
    // AppErrorの場合はコードをチェック
    if ('code' in error && typeof error.code === 'string') {
      return isRetryableError(error.code);
    }

    // ネットワークエラー
    if (
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('timeout') ||
      error.message.includes('ECONNRESET')
    ) {
      return true;
    }
  }

  return false;
}

/**
 * 使用例プリセット
 */
export const retryPresets = {
  // Claude API用
  claudeApi: {
    maxAttempts: 3,
    initialDelay: 2000,
    maxDelay: 60000,
    backoffFactor: 2,
    jitter: true,
    retryCondition: (error: unknown): boolean => {
      if (error instanceof Error && 'status' in error) {
        const status = (error as { status: number }).status;
        return status === 429 || status >= 500;
      }
      return false;
    },
  },

  // pyannote Server用
  pyannote: {
    maxAttempts: 2,
    initialDelay: 5000,
    maxDelay: 30000,
    backoffFactor: 2,
    jitter: false,
  },

  // データベース用
  database: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
    jitter: true,
    retryCondition: (error: unknown): boolean => {
      if (error instanceof Error) {
        return (
          error.message.includes('ECONNRESET') ||
          error.message.includes('connection') ||
          error.message.includes('timeout')
        );
      }
      return false;
    },
  },

  // ファイルアップロード用
  upload: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 15000,
    backoffFactor: 2,
    jitter: true,
  },

  // 軽量なリトライ（UIでの即座のフィードバックが必要な場合）
  quick: {
    maxAttempts: 2,
    initialDelay: 500,
    maxDelay: 2000,
    backoffFactor: 2,
    jitter: false,
  },
} as const;

/**
 * プリセットを使ったリトライ
 */
export function withPresetRetry<T>(
  fn: () => Promise<T>,
  preset: keyof typeof retryPresets,
  additionalOptions?: Partial<RetryOptions>
): Promise<T> {
  return withRetry(fn, {
    ...retryPresets[preset],
    ...additionalOptions,
  });
}
