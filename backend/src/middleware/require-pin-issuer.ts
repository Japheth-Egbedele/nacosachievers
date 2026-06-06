import type { NextFunction, Request, Response } from 'express';
import { getSupabase } from '../config/supabase.js';
import { ForbiddenError } from '../utils/errors.js';

/**
 * Allows super_admin or users with can_issue_pins.
 */
export async function requirePinIssuer(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.user) {
    next(new ForbiddenError());
    return;
  }
  if (req.user.role === 'super_admin') {
    next();
    return;
  }

  const { data } = await getSupabase()
    .from('users')
    .select('can_issue_pins')
    .eq('id', req.user.id)
    .maybeSingle();

  if (data?.can_issue_pins) {
    next();
    return;
  }

  next(new ForbiddenError());
}
