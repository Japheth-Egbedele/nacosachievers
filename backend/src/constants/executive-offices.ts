import type { AdminScope } from './admin-scopes.js';
import { ALL_ADMIN_SCOPES } from './admin-scopes.js';

export type ExecutiveOfficeKey =
  | 'president'
  | 'vice_president'
  | 'secretary_general'
  | 'assistant_secretary_general'
  | 'director_finance'
  | 'pro'
  | 'social_director'
  | 'sports_director'
  | 'welfare_director'
  | 'director_research_innovation'
  | 'director_academic_professional';

export interface ExecutiveOffice {
  key: ExecutiveOfficeKey;
  title: string;
  defaultScopes: AdminScope[];
}

export const EXECUTIVE_OFFICES: ExecutiveOffice[] = [
  { key: 'president', title: 'President', defaultScopes: ALL_ADMIN_SCOPES },
  { key: 'vice_president', title: 'Vice President', defaultScopes: ALL_ADMIN_SCOPES },
  {
    key: 'secretary_general',
    title: 'Secretary-General',
    defaultScopes: ['members', 'events', 'cms', 'audit'],
  },
  {
    key: 'assistant_secretary_general',
    title: 'Assistant Secretary-General',
    defaultScopes: ['members', 'events', 'cms'],
  },
  {
    key: 'director_finance',
    title: 'Director of Finance',
    defaultScopes: ['wallet', 'marketplace'],
  },
  { key: 'pro', title: 'Public Relations Officer (PRO)', defaultScopes: ['cms', 'events'] },
  { key: 'social_director', title: 'Social Director', defaultScopes: ['events', 'cms'] },
  { key: 'sports_director', title: 'Sports Director', defaultScopes: ['events'] },
  { key: 'welfare_director', title: 'Welfare Director', defaultScopes: ['members', 'events'] },
  {
    key: 'director_research_innovation',
    title: 'Director of Research & Innovation',
    defaultScopes: ['vault', 'careers', 'cms'],
  },
  {
    key: 'director_academic_professional',
    title: 'Director of Academic & Professional Development',
    defaultScopes: ['vault', 'lecturers', 'careers'],
  },
];

export function getOfficeByKey(key: string): ExecutiveOffice | undefined {
  return EXECUTIVE_OFFICES.find((o) => o.key === key);
}

export function officeDisplayTitle(officeKey: string | null | undefined, roleTitle: string): string {
  if (officeKey) {
    const office = getOfficeByKey(officeKey);
    if (office) return office.title;
  }
  return roleTitle;
}
