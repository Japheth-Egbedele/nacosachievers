import type { NextFunction, Request, Response } from 'express';
import { ForbiddenError } from '../utils/errors.js';

const HUB_ACCOUNT_ROLES = new Set([
  'member',
  'alumni',
  'executive',
  'super_admin',
  'staff',
]);

/** Allows any onboarded hub role (including staff) to load session profile. */
export function requireHubAccount(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new ForbiddenError());
    return;
  }
  if (!HUB_ACCOUNT_ROLES.has(req.user.role)) {
    next(new ForbiddenError('This area is not available for your account type'));
    return;
  }
  next();
}
