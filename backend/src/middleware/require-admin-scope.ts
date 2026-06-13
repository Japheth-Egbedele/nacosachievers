import type { NextFunction, Request, Response } from 'express';
import { getSupabase } from '../config/supabase.js';
import type { AdminScope } from '../constants/admin-scopes.js';
import { ForbiddenError } from '../utils/errors.js';

/**
 * Restricts admin routes to super_admin or executives with the required scope.
 * Empty admin_scopes is denied — run POST /admin/executives/sync-scopes after deploy.
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
      next(
        new ForbiddenError(
          'Your executive account has no admin permissions assigned. Contact a super admin to sync scopes from your office.',
        ),
      );
      return;
    }

    if (scopes.some((s) => userScopes.includes(s))) {
      next();
      return;
    }

    next(new ForbiddenError());
  };
}
