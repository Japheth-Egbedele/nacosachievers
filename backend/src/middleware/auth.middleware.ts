import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../services/token.service.js';
import { AuthError } from '../utils/errors.js';
import { ERROR_MESSAGES } from '../constants/messages.js';

/**
 * Verifies Bearer JWT and attaches req.user.
 */
export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(new AuthError(ERROR_MESSAGES.UNAUTHORIZED));
    return;
  }

  const token = header.slice(7);
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(new AuthError(ERROR_MESSAGES.UNAUTHORIZED));
  }
}

/**
 * Optional auth — attaches user when valid token present.
 */
export function optionalAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next();
    return;
  }
  try {
    const payload = verifyAccessToken(header.slice(7));
    req.user = { id: payload.sub, role: payload.role };
  } catch {
    // ignore invalid optional token
  }
  next();
}
