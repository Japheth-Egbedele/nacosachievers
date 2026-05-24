import { HTTP_STATUS } from '../constants/http.js';

export class AppError extends Error {
  readonly statusCode: number;
  readonly code?: string;
  readonly isOperational: boolean;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, code?: string) {
    super(message, HTTP_STATUS.UNPROCESSABLE, code ?? 'VALIDATION_ERROR');
  }
}

export class AuthError extends AppError {
  constructor(message: string, code?: string) {
    super(message, HTTP_STATUS.UNAUTHORIZED, code ?? 'AUTH_ERROR');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', code?: string) {
    super(message, HTTP_STATUS.FORBIDDEN, code ?? 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code?: string) {
    super(message, HTTP_STATUS.NOT_FOUND, code ?? 'NOT_FOUND');
  }
}
