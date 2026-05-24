import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/errors.js';
import { logger } from '../config/logger.js';
import { ERROR_MESSAGES } from '../constants/messages.js';
import { HTTP_STATUS } from '../constants/http.js';
import { sendError } from '../utils/response.js';

/**
 * Global error handler — logs server-side, returns safe client messages.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    if (err.statusCode >= HTTP_STATUS.INTERNAL) {
      logger.error(
        { err, route: req.originalUrl, method: req.method, userId: req.user?.id },
        err.message,
      );
    }
    sendError(res, err.message, err.statusCode, err.code);
    return;
  }

  logger.error(
    { err, route: req.originalUrl, method: req.method, userId: req.user?.id },
    'Unhandled error',
  );
  sendError(res, ERROR_MESSAGES.INTERNAL, HTTP_STATUS.INTERNAL, 'INTERNAL_ERROR');
}
