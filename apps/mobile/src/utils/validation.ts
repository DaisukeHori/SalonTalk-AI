/**
 * Validation Utilities
 * バリデーション関数
 */

/**
 * メールアドレスのバリデーション
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * パスワードのバリデーション（8文字以上、英数字を含む）
 */
export function isValidPassword(password: string): boolean {
  return password.length >= 8 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
}

/**
 * パスワード強度を計算（0-4のスコア）
 */
export function getPasswordStrength(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  return Math.min(score, 4);
}

/**
 * 電話番号のバリデーション（日本の形式）
 */
export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^0[0-9]{9,10}$/;
  return phoneRegex.test(phone.replace(/[-\s]/g, ''));
}

/**
 * 必須フィールドのバリデーション
 */
export function isRequired(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/**
 * 文字数制限のバリデーション
 */
export function isWithinLength(value: string, min: number, max: number): boolean {
  const length = value.length;
  return length >= min && length <= max;
}

/**
 * 数値範囲のバリデーション
 */
export function isWithinRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * URLのバリデーション
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * バリデーションエラーメッセージの型
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * フォームバリデーション結果の型
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * ログインフォームのバリデーション
 */
export function validateLoginForm(email: string, password: string): ValidationResult {
  const errors: ValidationError[] = [];

  if (!isRequired(email)) {
    errors.push({ field: 'email', message: 'メールアドレスを入力してください' });
  } else if (!isValidEmail(email)) {
    errors.push({ field: 'email', message: '有効なメールアドレスを入力してください' });
  }

  if (!isRequired(password)) {
    errors.push({ field: 'password', message: 'パスワードを入力してください' });
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * 顧客情報フォームのバリデーション
 */
export function validateCustomerInfo(info: {
  ageGroup?: string;
  gender?: string;
  visitType?: string;
}): ValidationResult {
  const errors: ValidationError[] = [];

  if (!isRequired(info.visitType)) {
    errors.push({ field: 'visitType', message: '来店タイプを選択してください' });
  }

  return { isValid: errors.length === 0, errors };
}
