import type { NextFunction, Request, Response } from 'express';
import { getSupabase } from '../config/supabase.js';
import { AuthError, ForbiddenError } from '../utils/errors.js';
import { ERROR_MESSAGES } from '../constants/messages.js';

/**
 * Requires authenticated user with verified email (for voting and elections list).
 */
export async function requireVerifiedMember(
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
    .select('is_email_verified, is_active')
    .eq('id', req.user.id)
    .single();

  if (error || !data) {
    next(new AuthError(ERROR_MESSAGES.UNAUTHORIZED));
    return;
  }
  if (!data.is_active) {
    next(new ForbiddenError('Account is not active'));
    return;
  }
  if (!data.is_email_verified) {
    next(new ForbiddenError('Please verify your email before using elections'));
    return;
  }
  next();
}
