import { USER_LEVELS, USER_ROLES, type UserLevel, type UserRole } from '../constants/enums.js';

export const MEMBER_SCOPES = ['chapter', 'registered', 'all'] as const;
export type MemberScope = (typeof MEMBER_SCOPES)[number];

export const MEMBER_LEVEL_BUCKETS = USER_LEVELS;

const CHAPTER_ROLES: UserRole[] = ['member', 'alumni', 'executive', 'staff'];
const REGISTERED_ROLES: UserRole[] = USER_ROLES.filter((r) => r !== 'guest');

export function rolesForScope(scope: MemberScope): UserRole[] | null {
  if (scope === 'chapter') return CHAPTER_ROLES;
  if (scope === 'registered') return REGISTERED_ROLES;
  return null;
}

export function normalizeMemberScope(scope?: string): MemberScope {
  if (scope === 'registered' || scope === 'all') return scope;
  return 'chapter';
}

/** Applies role filter for member scope without widening Supabase builder types. */
export function applyMemberScope<Q>(query: Q, scope: MemberScope): Q {
  const roles = rolesForScope(scope);
  if (!roles) return query;
  return (query as { in: (column: string, values: UserRole[]) => Q }).in('role', roles);
}

export type MemberLevelCounts = Record<UserLevel, number>;

export function emptyLevelCounts(): MemberLevelCounts {
  return { '100': 0, '200': 0, '300': 0, '400': 0, staff: 0 };
}
