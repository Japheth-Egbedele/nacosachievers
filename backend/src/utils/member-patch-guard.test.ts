import { describe, expect, it } from 'vitest';
import { ForbiddenError } from '../utils/errors.js';
import { assertMemberPatchAllowed } from '../utils/member-patch-guard.js';

describe('assertMemberPatchAllowed', () => {
  it('blocks executives from changing role', () => {
    expect(() =>
      assertMemberPatchAllowed('executive', 'member', { role: 'executive' }),
    ).toThrow(ForbiddenError);
  });

  it('blocks granting super_admin to non-super-admin actors', () => {
    expect(() =>
      assertMemberPatchAllowed('executive', 'member', { role: 'super_admin' }),
    ).toThrow(ForbiddenError);
  });

  it('allows super_admin to deactivate a member', () => {
    expect(() =>
      assertMemberPatchAllowed('super_admin', 'member', { is_active: false }),
    ).not.toThrow();
  });
});
