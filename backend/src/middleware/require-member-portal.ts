import type { NextFunction, Request, Response } from 'express';
import { ForbiddenError } from '../utils/errors.js';

const MEMBER_PORTAL_ROLES = new Set(['member', 'alumni', 'executive', 'super_admin']);

/** Blocks staff and guest from member portal APIs. */
export function requireMemberPortal(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new ForbiddenError());
    return;
  }
  if (!MEMBER_PORTAL_ROLES.has(req.user.role)) {
    next(new ForbiddenError('This area is not available for staff accounts'));
    return;
  }
  next();
}
