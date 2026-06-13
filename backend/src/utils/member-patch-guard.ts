import type { AcademicStatus, UserRole } from '../constants/enums.js';
import { ForbiddenError } from './errors.js';

export type MemberPatchInput = {
  role?: UserRole;
  is_active?: boolean;
  academic_status?: AcademicStatus;
};

/** Validates privileged member patch fields before DB update. */
export function assertMemberPatchAllowed(
  actorRole: UserRole,
  existingRole: UserRole,
  patch: MemberPatchInput,
): void {
  const privilegedPatch =
    patch.role !== undefined ||
    patch.is_active !== undefined ||
    patch.academic_status !== undefined;

  if (privilegedPatch && actorRole !== 'super_admin') {
    throw new ForbiddenError('Only super admins can change role, active status, or academic status');
  }
  if (patch.role === 'super_admin' && actorRole !== 'super_admin') {
    throw new ForbiddenError('Only super admins can grant super admin role');
  }
  if (existingRole === 'super_admin' && actorRole !== 'super_admin') {
    throw new ForbiddenError('Only super admins can modify super admin accounts');
  }
}
