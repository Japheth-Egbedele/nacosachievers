import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from '../constants/auth.js';

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

/**
 * Parses and clamps pagination query params.
 * @param query Page and limit from request query
 * @returns Normalized pagination values
 */
export function parsePagination(query: {
  page?: unknown;
  limit?: unknown;
}): PaginationParams {
  const page = Math.max(DEFAULT_PAGE, Number(query.page) || DEFAULT_PAGE);
  const rawLimit = Number(query.limit) || DEFAULT_LIMIT;
  const limit = Math.min(MAX_LIMIT, Math.max(1, rawLimit));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/**
 * Builds pagination metadata for list responses.
 * @param total Total matching records
 * @param page Current page
 * @param limit Page size
 */
export function buildMeta(total: number, page: number, limit: number) {
  return { total, page, limit };
}
