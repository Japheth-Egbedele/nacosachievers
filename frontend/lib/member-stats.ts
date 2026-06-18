export const MEMBER_SCOPES = ['chapter', 'registered', 'all'] as const;
export type MemberScope = (typeof MEMBER_SCOPES)[number];

export const MEMBER_LEVELS = ['100', '200', '300', '400', 'staff'] as const;
export type MemberLevel = (typeof MEMBER_LEVELS)[number];
export type LevelFilter = 'all' | MemberLevel;

export const MEMBER_SCOPE_STORAGE_KEY = 'nacos-admin-member-scope';

export const SCOPE_OPTIONS: { key: MemberScope; label: string }[] = [
  { key: 'chapter', label: 'Chapter members' },
  { key: 'registered', label: 'Registered accounts' },
  { key: 'all', label: 'Everyone' },
];

export type MemberStats = {
  scope: MemberScope;
  total: number;
  by_level: Record<MemberLevel, number>;
  unassigned: number;
};

export function normalizeMemberScope(value: string | null | undefined): MemberScope {
  if (value === 'registered' || value === 'all') return value;
  return 'chapter';
}

export function normalizeLevelFilter(value: string | null | undefined): LevelFilter {
  if (value === '100' || value === '200' || value === '300' || value === '400' || value === 'staff') {
    return value;
  }
  return 'all';
}

export function levelLabel(level: MemberLevel): string {
  return level === 'staff' ? 'Staff' : `L${level}`;
}

export function levelTabLabel(level: LevelFilter, count?: number): string {
  const base = level === 'all' ? 'All' : levelLabel(level);
  if (count === undefined) return base;
  return `${base} (${count})`;
}

export function readStoredMemberScope(): MemberScope {
  if (typeof window === 'undefined') return 'chapter';
  try {
    const raw = localStorage.getItem(MEMBER_SCOPE_STORAGE_KEY);
    return normalizeMemberScope(raw ?? undefined);
  } catch {
    return 'chapter';
  }
}

export function storeMemberScope(scope: MemberScope): void {
  try {
    localStorage.setItem(MEMBER_SCOPE_STORAGE_KEY, scope);
  } catch {
    /* ignore quota / private mode */
  }
}

export function buildMembersQuery(params: {
  scope: MemberScope;
  level: LevelFilter;
  page: number;
  limit: number;
  search?: string;
  verified?: 'all' | 'verified' | 'unverified';
}): string {
  const q = new URLSearchParams();
  q.set('scope', params.scope);
  q.set('page', String(params.page));
  q.set('limit', String(params.limit));
  if (params.level !== 'all') q.set('level', params.level);
  if (params.search?.trim()) q.set('search', params.search.trim());
  if (params.verified === 'verified') q.set('is_email_verified', 'true');
  if (params.verified === 'unverified') q.set('is_email_verified', 'false');
  return `?${q.toString()}`;
}
