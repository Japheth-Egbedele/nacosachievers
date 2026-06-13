import type { NextFunction, Request, Response } from 'express';
import { getSupabase } from '../config/supabase.js';
import { ERROR_MESSAGES } from '../constants/messages.js';
import type { UserRole } from '../constants/enums.js';
import { AuthError, ForbiddenError } from '../utils/errors.js';

/**
 * Re-validates the user from the database (role, is_active, can_issue_pins).
 */
export async function requireActiveUser(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.user?.id) {
    next(new AuthError(ERROR_MESSAGES.UNAUTHORIZED));
    return;
  }

  const { data, error } = await getSupabase()
    .from('users')
    .select('role, is_active, can_issue_pins')
    .eq('id', req.user.id)
    .maybeSingle();

  if (error) {
    next(error);
    return;
  }

  if (!data?.is_active) {
    next(new ForbiddenError(ERROR_MESSAGES.ACCOUNT_INACTIVE, 'ACCOUNT_INACTIVE'));
    return;
  }

  req.user = {
    id: req.user.id,
    role: data.role as UserRole,
    ...(data.can_issue_pins ? { can_issue_pins: true } : {}),
  };
  next();
}
