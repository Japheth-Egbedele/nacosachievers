import type { NextFunction, Request, Response } from 'express';
import { getSupabase } from '../config/supabase.js';
import type { AdminScope } from '../constants/admin-scopes.js';
import { ForbiddenError } from '../utils/errors.js';

/**
 * Restricts admin routes to super_admin or executives with the required scope.
 * Legacy executives (empty admin_scopes) retain full access until scopes are assigned.
 */
export function requireAdminScope(...scopes: AdminScope[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      next(new ForbiddenError());
      return;
    }
    if (req.user.role === 'super_admin') {
      next();
      return;
    }
    if (req.user.role !== 'executive') {
      next(new ForbiddenError());
      return;
    }

    const { data, error } = await getSupabase()
      .from('users')
      .select('admin_scopes')
      .eq('id', req.user.id)
      .maybeSingle();

    if (error) {
      next(error);
      return;
    }

    const userScopes = (data?.admin_scopes as string[] | null) ?? [];
    if (userScopes.length === 0) {
      next();
      return;
    }

    if (scopes.some((s) => userScopes.includes(s))) {
      next();
      return;
    }

    next(new ForbiddenError());
  };
}
