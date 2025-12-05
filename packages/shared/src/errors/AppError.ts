/**
 * AppError Classes
 * アプリケーションエラークラス
 *
 * Based on 詳細設計書 10.2 エラーハンドリングクラス
 */

import { ErrorCode, getErrorDefinition } from './errorCodes';

/**
 * アプリケーションエラー基底クラス
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly httpStatus: number;
  public readonly details?: Record<string, unknown>;
  public readonly cause?: Error;
  public readonly timestamp: Date;

  constructor(
    errorCode: ErrorCode,
    details?: Record<string, unknown>,
    cause?: Error
  ) {
    const errorDef = getErrorDefinition(errorCode);
    super(errorDef.message);

    this.name = 'AppError';
    this.code = errorDef.code;
    this.httpStatus = errorDef.httpStatus;
    this.details = details;
    this.cause = cause;
    this.timestamp = new Date();

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * JSONシリアライズ用
   */
  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        timestamp: this.timestamp.toISOString(),
      },
    };
  }

  /**
   * ログ出力用
   */
  toLogObject() {
    return {
      errorCode: this.code,
      message: this.message,
      httpStatus: this.httpStatus,
      details: this.details,
      stack: this.stack,
      cause: this.cause?.message,
      timestamp: this.timestamp.toISOString(),
    };
  }

  /**
   * ユーザー向けメッセージを取得
   */
  getUserMessage(): string {
    return this.message;
  }

  /**
   * リトライ可能なエラーかどうか
   */
  isRetryable(): boolean {
    return isRetryableError(this.code);
  }
}

/**
 * バリデーションエラー
 */
export class ValidationError extends AppError {
  public readonly fieldErrors?: Record<string, string[]>;

  constructor(message: string, fieldErrors?: Record<string, string[]>) {
    super('VAL_001', { message, fieldErrors });
    this.name = 'ValidationError';
    this.message = message;
    this.fieldErrors = fieldErrors;
  }
}

/**
 * 認証エラー
 */
export class AuthenticationError extends AppError {
  constructor(
    errorCode: 'AUTH_001' | 'AUTH_002' | 'AUTH_003' | 'AUTH_004' = 'AUTH_001'
  ) {
    super(errorCode);
    this.name = 'AuthenticationError';
  }
}

/**
 * リソース未検出エラー
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super('SES_001', { resource, id });
    this.message = `${resource}が見つかりません`;
    this.name = 'NotFoundError';
  }
}

/**
 * AI処理エラー
 */
export class AIError extends AppError {
  constructor(
    errorCode: 'AI_001' | 'AI_002' | 'AI_003' = 'AI_001',
    details?: Record<string, unknown>
  ) {
    super(errorCode, details);
    this.name = 'AIError';
  }
}

/**
 * 話者分離エラー
 */
export class DiarizationError extends AppError {
  constructor(
    errorCode: 'DIA_001' | 'DIA_002' | 'DIA_003' = 'DIA_001',
    details?: Record<string, unknown>
  ) {
    super(errorCode, details);
    this.name = 'DiarizationError';
  }
}

/**
 * データベースエラー
 */
export class DatabaseError extends AppError {
  constructor(
    errorCode: 'DB_001' | 'DB_002' | 'DB_003' | 'DB_004' = 'DB_002',
    details?: Record<string, unknown>
  ) {
    super(errorCode, details);
    this.name = 'DatabaseError';
  }
}

/**
 * ネットワークエラー
 */
export class NetworkError extends AppError {
  constructor(
    errorCode: 'NET_001' | 'NET_002' = 'NET_001',
    details?: Record<string, unknown>
  ) {
    super(errorCode, details);
    this.name = 'NetworkError';
  }
}

/**
 * リトライ可能なエラーか判定
 */
export function isRetryableError(code: string): boolean {
  const retryableCodes = [
    'AI_002', // レート制限
    'AI_003', // タイムアウト
    'DIA_001', // 話者分離失敗
    'DIA_002', // 話者分離タイムアウト
    'DIA_003', // サーバー接続失敗
    'DB_001', // DB接続失敗
    'NET_001', // ネットワーク接続失敗
    'NET_002', // ネットワークタイムアウト
    'STR_001', // アップロード失敗
  ];

  return retryableCodes.includes(code);
}

/**
 * エラーからAppErrorを生成
 */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    // ネットワークエラーの検出
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return new NetworkError('NET_001', { originalMessage: error.message });
    }

    // タイムアウトエラーの検出
    if (error.message.includes('timeout')) {
      return new NetworkError('NET_002', { originalMessage: error.message });
    }

    return new AppError('SYS_001', { originalMessage: error.message }, error);
  }

  return new AppError('SYS_001', {
    originalMessage: String(error),
  });
}
