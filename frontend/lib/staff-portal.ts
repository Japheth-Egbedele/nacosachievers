/** Routes lecturers (staff role) may access in the Hub portal. */
const STAFF_ALLOWED_PREFIXES = ['/hub/elections'];

export function isStaffPortalPath(pathname: string): boolean {
  return STAFF_ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export const staffElectionLinks = [
  { href: '/hub/elections', label: 'Election results' },
] as const;
