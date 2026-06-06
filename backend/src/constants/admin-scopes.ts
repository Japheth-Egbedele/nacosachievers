export const ADMIN_SCOPES = [
  'members',
  'elections',
  'vault',
  'lecturers',
  'wallet',
  'marketplace',
  'events',
  'careers',
  'yearbook',
  'cms',
  'audit',
] as const;

export type AdminScope = (typeof ADMIN_SCOPES)[number];

export const ALL_ADMIN_SCOPES: AdminScope[] = [...ADMIN_SCOPES];
