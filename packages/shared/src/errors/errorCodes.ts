/**
 * Error Codes
 * エラーコード定義
 *
 * Based on 詳細設計書 10.1 エラーコード体系
 */

export const ErrorCodes = {
  // 認証エラー (AUTH_xxx)
  AUTH_001: { code: 'AUTH_001', message: '認証トークンが無効です', httpStatus: 401 },
  AUTH_002: { code: 'AUTH_002', message: 'トークンの有効期限が切れています', httpStatus: 401 },
  AUTH_003: { code: 'AUTH_003', message: 'この操作を行う権限がありません', httpStatus: 403 },
  AUTH_004: { code: 'AUTH_004', message: 'アカウントが無効です', httpStatus: 403 },

  // バリデーションエラー (VAL_xxx)
  VAL_001: { code: 'VAL_001', message: '必須項目が入力されていません', httpStatus: 400 },
  VAL_002: { code: 'VAL_002', message: '入力形式が正しくありません', httpStatus: 400 },
  VAL_003: { code: 'VAL_003', message: '入力値が範囲外です', httpStatus: 400 },
  VAL_004: { code: 'VAL_004', message: 'ファイルサイズが上限を超えています', httpStatus: 400 },
  VAL_005: { code: 'VAL_005', message: 'ファイル形式がサポートされていません', httpStatus: 400 },

  // セッションエラー (SES_xxx)
  SES_001: { code: 'SES_001', message: 'セッションが見つかりません', httpStatus: 404 },
  SES_002: { code: 'SES_002', message: 'セッションは既に終了しています', httpStatus: 400 },
  SES_003: { code: 'SES_003', message: 'セッションは処理中です', httpStatus: 409 },
  SES_004: { code: 'SES_004', message: '既にアクティブなセッションがあります', httpStatus: 409 },

  // AI処理エラー (AI_xxx)
  AI_001: { code: 'AI_001', message: 'AI分析処理に失敗しました', httpStatus: 500 },
  AI_002: { code: 'AI_002', message: 'AI APIのレート制限に達しました', httpStatus: 429 },
  AI_003: { code: 'AI_003', message: 'AI処理がタイムアウトしました', httpStatus: 504 },

  // 話者分離エラー (DIA_xxx)
  DIA_001: { code: 'DIA_001', message: '話者分離処理に失敗しました', httpStatus: 500 },
  DIA_002: { code: 'DIA_002', message: '話者分離がタイムアウトしました', httpStatus: 504 },
  DIA_003: { code: 'DIA_003', message: '話者分離サーバーに接続できません', httpStatus: 503 },

  // データベースエラー (DB_xxx)
  DB_001: { code: 'DB_001', message: 'データベースに接続できません', httpStatus: 500 },
  DB_002: { code: 'DB_002', message: 'データの取得に失敗しました', httpStatus: 500 },
  DB_003: { code: 'DB_003', message: 'データの保存に失敗しました', httpStatus: 500 },
  DB_004: { code: 'DB_004', message: 'データが既に存在します', httpStatus: 409 },

  // ネットワークエラー (NET_xxx)
  NET_001: { code: 'NET_001', message: 'ネットワークに接続できません', httpStatus: 503 },
  NET_002: { code: 'NET_002', message: '通信がタイムアウトしました', httpStatus: 504 },

  // ストレージエラー (STR_xxx)
  STR_001: { code: 'STR_001', message: 'ファイルのアップロードに失敗しました', httpStatus: 500 },
  STR_002: { code: 'STR_002', message: 'ファイルのダウンロードに失敗しました', httpStatus: 500 },

  // システムエラー (SYS_xxx)
  SYS_001: { code: 'SYS_001', message: 'システムエラーが発生しました', httpStatus: 500 },
} as const;

export type ErrorCode = keyof typeof ErrorCodes;

export interface ErrorDefinition {
  code: string;
  message: string;
  httpStatus: number;
}

export function getErrorDefinition(code: ErrorCode): ErrorDefinition {
  return ErrorCodes[code];
}

export function isErrorCode(code: string): code is ErrorCode {
  return code in ErrorCodes;
}
