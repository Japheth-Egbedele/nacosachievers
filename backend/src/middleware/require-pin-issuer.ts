import type { NextFunction, Request, Response } from 'express';
import { getSupabase } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import { ERROR_MESSAGES } from '../constants/messages.js';
import { ForbiddenError } from '../utils/errors.js';

/**
 * Allows super_admin or users with can_issue_pins (JWT claim or DB).
 */
export async function requirePinIssuer(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.user) {
    next(new ForbiddenError(ERROR_MESSAGES.PIN_ISSUER_FORBIDDEN, 'PIN_ISSUER_FORBIDDEN'));
    return;
  }

  if (req.user.role === 'super_admin') {
    next();
    return;
  }

  try {
    const { data, error } = await getSupabase()
      .from('users')
      .select('can_issue_pins, role, is_active')
      .eq('id', req.user.id)
      .maybeSingle();

    if (error) {
      logger.warn(
        { err: error, userId: req.user.id, route: 'requirePinIssuer' },
        'PIN issuer DB check failed',
      );
      next(new ForbiddenError(ERROR_MESSAGES.PIN_ISSUER_FORBIDDEN, 'PIN_ISSUER_FORBIDDEN'));
      return;
    }

    if (!data?.is_active) {
      logger.info({ userId: req.user.id }, 'PIN generate denied: inactive account');
      next(new ForbiddenError(ERROR_MESSAGES.ACCOUNT_INACTIVE, 'ACCOUNT_INACTIVE'));
      return;
    }

    if (data.can_issue_pins) {
      next();
      return;
    }

    logger.info(
      { userId: req.user.id, role: req.user.role, dbRole: data.role },
      'PIN generate denied: can_issue_pins false',
    );
    next(new ForbiddenError(ERROR_MESSAGES.PIN_ISSUER_FORBIDDEN, 'PIN_ISSUER_FORBIDDEN'));
  } catch (err) {
    next(err);
  }
}
