export type AdminNavItem = {
  href: string;
  label: string;
  /** Only super_admin sees this link */
  superAdminOnly?: boolean;
};

export const ADMIN_NAV: AdminNavItem[] = [
  { href: '/hub/admin', label: 'Overview' },
  { href: '/hub/admin/members', label: 'Members' },
  { href: '/hub/admin/pins', label: 'PINs', superAdminOnly: true },
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
];

export function filterAdminNav(isSuperAdmin: boolean): AdminNavItem[] {
  return ADMIN_NAV.filter((item) => !item.superAdminOnly || isSuperAdmin);
}
