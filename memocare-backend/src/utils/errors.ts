export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'ACCOUNT_NOT_VERIFIED'
  | 'ACCOUNT_PENDING_APPROVAL'
  | 'ACCOUNT_SUSPENDED'
  | 'INVALID_CREDENTIALS'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'INVALID_CODE'
  | 'ACCOUNT_INACTIVE';

/**
 * AppError is the single error type all services/controllers should throw.
 * The centralized error handler middleware maps this to a consistent JSON
 * response shape: { error: { code, message, details? } }.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: unknown;

  constructor(statusCode: number, code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(400, 'VALIDATION_ERROR', message, details);
  }
  static unauthorized(message = 'Unauthorized') {
    return new AppError(401, 'UNAUTHORIZED', message);
  }
  static forbidden(message = 'Forbidden') {
    return new AppError(403, 'FORBIDDEN', message);
  }
  static notFound(message = 'Resource not found') {
    return new AppError(404, 'NOT_FOUND', message);
  }
  static conflict(message: string) {
    return new AppError(409, 'CONFLICT', message);
  }
  static internal(message = 'Internal server error') {
    return new AppError(500, 'INTERNAL_ERROR', message);
  }
  static serviceUnavailable(message: string) {
    return new AppError(503, 'INTERNAL_ERROR', message);
  }
}
