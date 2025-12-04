/**
 * Validation Utilities
 * バリデーションユーティリティ
 */

export class ValidationError extends Error {
  public field?: string;
  public code: string;

  constructor(message: string, field?: string, code: string = 'VALIDATION_ERROR') {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.code = code;
  }
}

type SchemaType = 'string' | 'number' | 'boolean' | 'array' | 'object';

interface SchemaField {
  type: SchemaType;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: readonly unknown[];
  items?: SchemaField;
  validate?: (value: unknown) => boolean;
}

type Schema = Record<string, SchemaField>;

/**
 * Validate request body against schema
 */
export function validateRequest<T>(data: unknown, schema: Schema): T {
  if (typeof data !== 'object' || data === null) {
    throw new ValidationError('Request body must be an object');
  }

  const result: Record<string, unknown> = {};
  const dataObj = data as Record<string, unknown>;

  for (const [field, fieldSchema] of Object.entries(schema)) {
    const value = dataObj[field];

    // Check required fields
    if (fieldSchema.required && (value === undefined || value === null)) {
      throw new ValidationError(`Field '${field}' is required`, field, 'REQUIRED');
    }

    // Skip validation if field is not provided and not required
    if (value === undefined || value === null) {
      continue;
    }

    // Type validation
    if (!validateType(value, fieldSchema.type)) {
      throw new ValidationError(
        `Field '${field}' must be of type ${fieldSchema.type}`,
        field,
        'INVALID_TYPE'
      );
    }

    // String validations
    if (fieldSchema.type === 'string' && typeof value === 'string') {
      if (fieldSchema.minLength !== undefined && value.length < fieldSchema.minLength) {
        throw new ValidationError(
          `Field '${field}' must be at least ${fieldSchema.minLength} characters`,
          field,
          'MIN_LENGTH'
        );
      }
      if (fieldSchema.maxLength !== undefined && value.length > fieldSchema.maxLength) {
        throw new ValidationError(
          `Field '${field}' must be at most ${fieldSchema.maxLength} characters`,
          field,
          'MAX_LENGTH'
        );
      }
      if (fieldSchema.pattern && !fieldSchema.pattern.test(value)) {
        throw new ValidationError(
          `Field '${field}' has invalid format`,
          field,
          'INVALID_FORMAT'
        );
      }
    }

    // Number validations
    if (fieldSchema.type === 'number' && typeof value === 'number') {
      if (fieldSchema.min !== undefined && value < fieldSchema.min) {
        throw new ValidationError(
          `Field '${field}' must be at least ${fieldSchema.min}`,
          field,
          'MIN_VALUE'
        );
      }
      if (fieldSchema.max !== undefined && value > fieldSchema.max) {
        throw new ValidationError(
          `Field '${field}' must be at most ${fieldSchema.max}`,
          field,
          'MAX_VALUE'
        );
      }
    }

    // Enum validation
    if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
      throw new ValidationError(
        `Field '${field}' must be one of: ${fieldSchema.enum.join(', ')}`,
        field,
        'INVALID_ENUM'
      );
    }

    // Array validation
    if (fieldSchema.type === 'array' && Array.isArray(value) && fieldSchema.items) {
      for (let i = 0; i < value.length; i++) {
        if (!validateType(value[i], fieldSchema.items.type)) {
          throw new ValidationError(
            `Field '${field}[${i}]' must be of type ${fieldSchema.items.type}`,
            `${field}[${i}]`,
            'INVALID_ITEM_TYPE'
          );
        }
      }
    }

    // Custom validation
    if (fieldSchema.validate && !fieldSchema.validate(value)) {
      throw new ValidationError(
        `Field '${field}' failed custom validation`,
        field,
        'CUSTOM_VALIDATION'
      );
    }

    result[field] = value;
  }

  return result as T;
}

/**
 * Validate type
 */
function validateType(value: unknown, type: SchemaType): boolean {
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    default:
      return false;
  }
}

/**
 * Validate UUID format
 */
export function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Validate email format
 */
export function isValidEmail(value: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

/**
 * Validate URL format
 */
export function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize string input
 */
export function sanitizeString(value: string): string {
  return value
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .slice(0, 10000); // Limit length
}

/**
 * Validate and parse date string
 */
export function parseDate(value: string): Date | null {
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}
