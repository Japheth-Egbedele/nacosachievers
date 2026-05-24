import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '../constants/enums.js';
import { ForbiddenError } from '../utils/errors.js';

/**
 * Restricts route access to specified roles.
 * @param roles Allowed roles
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new ForbiddenError());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new ForbiddenError());
      return;
    }
    next();
  };
}

/**
 * Allows executive or super_admin access.
 */
export const requireExecutive = requireRole('executive', 'super_admin');

/**
 * Allows super_admin only.
 */
export const requireSuperAdmin = requireRole('super_admin');
