import type { Response } from 'express';
import { HTTP_STATUS } from '../constants/http.js';

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
}

/**
 * Sends a success JSON envelope.
 * @param res Express response
 * @param data Response payload
 * @param statusCode HTTP status code
 * @param message Optional message
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = HTTP_STATUS.OK,
  message?: string,
): void {
  res.status(statusCode).json({
    success: true,
    data,
    ...(message ? { message } : {}),
  });
}

/**
 * Sends a paginated success JSON envelope.
 * @param res Express response
 * @param data Array payload
 * @param meta Pagination metadata
 */
export function sendPaginated<T>(res: Response, data: T[], meta: PaginationMeta): void {
  res.status(HTTP_STATUS.OK).json({
    success: true,
    data,
    meta,
  });
}

/**
 * Sends an error JSON envelope.
 * @param res Express response
 * @param error Error message
 * @param statusCode HTTP status code
 * @param code Optional error code
 */
export function sendError(
  res: Response,
  error: string,
  statusCode: number,
  code?: string,
): void {
  res.status(statusCode).json({
    success: false,
    error,
    ...(code ? { code } : {}),
  });
}
