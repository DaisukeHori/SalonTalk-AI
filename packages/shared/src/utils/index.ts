/**
 * Shared Utilities
 * 共有ユーティリティ関数
 */

// ===========================================
// Date Utilities
// ===========================================

/**
 * 日付を日本語フォーマットに変換
 */
export function formatDateJa(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * 日時を日本語フォーマットに変換
 */
export function formatDateTimeJa(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 時刻のみをフォーマット
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * ミリ秒を「X分Y秒」形式に変換
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}秒`;
  }
  if (seconds === 0) {
    return `${minutes}分`;
  }
  return `${minutes}分${seconds}秒`;
}

/**
 * ミリ秒を「HH:MM:SS」形式に変換
 */
export function formatDurationHMS(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

// ===========================================
// Number Utilities
// ===========================================

/**
 * 数値を指定桁で丸める
 */
export function round(value: number, decimals: number = 0): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * 数値を0-100の範囲にクランプ
 */
export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * パーセンテージを計算
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return round((value / total) * 100, 1);
}

// ===========================================
// String Utilities
// ===========================================

/**
 * 文字列を指定長で切り詰め
 */
export function truncate(str: string, maxLength: number, suffix: string = '...'): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * 空白を正規化（連続空白を1つに）
 */
export function normalizeWhitespace(str: string): string {
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * HTMLタグを除去
 */
export function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}

// ===========================================
// Array Utilities
// ===========================================

/**
 * 配列をチャンクに分割
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * 配列から重複を除去
 */
export function unique<T>(array: T[]): T[] {
  return [...new Set(array)];
}

/**
 * 配列をシャッフル
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ===========================================
// Validation Utilities
// ===========================================

/**
 * メールアドレスの簡易検証
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * UUIDの検証
 */
export function isValidUuid(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// ===========================================
// Async Utilities
// ===========================================

/**
 * 指定ミリ秒待機
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * リトライ付き非同期関数実行
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: { retries: number; delay: number; backoff?: number } = {
    retries: 3,
    delay: 1000,
    backoff: 2,
  }
): Promise<T> {
  const { retries, delay, backoff = 1 } = options;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < retries) {
        await sleep(delay * Math.pow(backoff, attempt));
      }
    }
  }

  throw lastError;
}

/**
 * タイムアウト付きPromise
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage?: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage || `Operation timed out after ${ms}ms`));
    }, ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

// ===========================================
// Error Utilities
// ===========================================

/**
 * エラーメッセージを安全に取得
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error occurred';
}

/**
 * カスタムエラークラス
 */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

// ===========================================
// Object Utilities
// ===========================================

/**
 * オブジェクトからnull/undefinedを除去
 */
export function omitNullish<T extends Record<string, unknown>>(
  obj: T
): { [K in keyof T]: NonNullable<T[K]> } {
  const result = {} as { [K in keyof T]: NonNullable<T[K]> };
  for (const key in obj) {
    if (obj[key] != null) {
      result[key] = obj[key] as NonNullable<T[typeof key]>;
    }
  }
  return result;
}

/**
 * ディープクローン
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
