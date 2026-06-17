import type { AdminScope } from './executive-offices';

export type AdminNavItem = {
  href: string;
  label: string;
  /** Only super_admin sees this link */
  superAdminOnly?: boolean;
  /** Visible to super_admin or users with can_issue_pins */
  pinIssuerOnly?: boolean;
  /** Required admin scope for executives (super_admin always sees all) */
  scope?: AdminScope;
};

export const ADMIN_NAV: AdminNavItem[] = [
  { href: '/hub/admin', label: 'Overview' },
  { href: '/hub/admin/members', label: 'Members', scope: 'members' },
  { href: '/hub/admin/pins', label: 'PINs', pinIssuerOnly: true },
  { href: '/hub/admin/elections', label: 'Elections', scope: 'elections' },
  { href: '/hub/admin/executives', label: 'Executives', superAdminOnly: true },
  { href: '/hub/admin/settings', label: 'Settings', superAdminOnly: true },
  { href: '/hub/admin/vault', label: 'Vault', scope: 'vault' },
  { href: '/hub/admin/lecturers', label: 'Lecturers', scope: 'lecturers' },
  { href: '/hub/admin/careers', label: 'Careers', scope: 'careers' },
  { href: '/hub/admin/events', label: 'Events', scope: 'events' },
  { href: '/hub/admin/wallet', label: 'Wallet', scope: 'wallet' },
  { href: '/hub/admin/marketplace', label: 'Marketplace', scope: 'marketplace' },
  { href: '/hub/admin/yearbook', label: 'Yearbook', scope: 'yearbook' },
  { href: '/hub/admin/cms', label: 'CMS & content', scope: 'cms' },
  { href: '/hub/admin/audit', label: 'Audit log', scope: 'audit' },
];

/** Scoped executives see nav items matching their admin_scopes. */
export function filterAdminNav(
  isSuperAdmin: boolean,
  canIssuePins = false,
  isExecutive = false,
  adminScopes: AdminScope[] = [],
): AdminNavItem[] {
  return ADMIN_NAV.filter((item) => {
    if (item.superAdminOnly && !isSuperAdmin) return false;
    if (item.pinIssuerOnly && !isSuperAdmin && !canIssuePins) return false;
    if (item.scope && isExecutive && !isSuperAdmin) {
      return adminScopes.includes(item.scope);
    }
    return true;
  });
}

/** Whether the current pathname is allowed for this admin user. */
export function isAdminPathAllowed(
  pathname: string,
  isSuperAdmin: boolean,
  canIssuePins: boolean,
  isExecutive: boolean,
  adminScopes: AdminScope[] = [],
): boolean {
  if (!isExecutive && !isSuperAdmin) return false;
  if (pathname === '/hub/admin' || pathname === '/hub/admin/') return true;
  const links = filterAdminNav(isSuperAdmin, canIssuePins, isExecutive, adminScopes);
  return links.some(
    (item) =>
      item.href !== '/hub/admin' &&
      (pathname === item.href || pathname.startsWith(`${item.href}/`)),
  );
}
