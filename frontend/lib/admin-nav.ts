export type AdminNavItem = {
  href: string;
  label: string;
  /** Only super_admin sees this link */
  superAdminOnly?: boolean;
  /** Visible to super_admin or users with can_issue_pins */
  pinIssuerOnly?: boolean;
};

export const ADMIN_NAV: AdminNavItem[] = [
  { href: '/hub/admin', label: 'Overview' },
  { href: '/hub/admin/members', label: 'Members' },
  { href: '/hub/admin/pins', label: 'PINs', pinIssuerOnly: true },
  { href: '/hub/admin/elections', label: 'Elections' },
  { href: '/hub/admin/executives', label: 'Executives', superAdminOnly: true },
  { href: '/hub/admin/settings', label: 'Settings', superAdminOnly: true },
  { href: '/hub/admin/vault', label: 'Vault' },
  { href: '/hub/admin/lecturers', label: 'Lecturers' },
  { href: '/hub/admin/careers', label: 'Careers' },
  { href: '/hub/admin/events', label: 'Events' },
  { href: '/hub/admin/wallet', label: 'Wallet' },
  { href: '/hub/admin/marketplace', label: 'Marketplace' },
  { href: '/hub/admin/yearbook', label: 'Yearbook' },
  { href: '/hub/admin/cms', label: 'CMS & content' },
  { href: '/hub/admin/audit', label: 'Audit log' },
];

/** Pin-only issuers (not executive/super_admin) see only PINs in the sidebar. */
export function filterAdminNav(
  isSuperAdmin: boolean,
  canIssuePins = false,
  isExecutive = false,
): AdminNavItem[] {
  const pinOnlyIssuer = canIssuePins && !isSuperAdmin && !isExecutive;

  return ADMIN_NAV.filter((item) => {
    if (pinOnlyIssuer) return item.pinIssuerOnly === true;
    if (item.superAdminOnly && !isSuperAdmin) return false;
    if (item.pinIssuerOnly && !isSuperAdmin && !canIssuePins) return false;
    return true;
  });
}
