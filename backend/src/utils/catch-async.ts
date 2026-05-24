import type { RequestHandler } from 'express';

type AsyncRequestHandler = (
  req: Parameters<RequestHandler>[0],
  res: Parameters<RequestHandler>[1],
  next: Parameters<RequestHandler>[2],
) => Promise<void>;

/**
 * Wraps async route handlers to forward errors to Express error middleware.
 * @param fn Async request handler
 * @returns Express-compatible handler
 */
export function catchAsync(fn: AsyncRequestHandler): RequestHandler {
  return (req, res, next) => {
    void fn(req, res, next).catch(next);
  };
}
