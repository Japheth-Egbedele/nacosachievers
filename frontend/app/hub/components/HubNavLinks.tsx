'use client';

import Link from 'next/link';
import {
  IconAdmin,
  IconBell,
  IconElections,
  IconKey,
  IconLogout,
  IconMessages,
  IconUser,
  IconVault,
  IconWallet,
} from '@/app/hub/components/ui/HubIcons';
import type { AuthUser } from '@/lib/auth-context';
import type { getHubGreeting } from '@/lib/hub-greeting';
import { staffElectionLinks } from '@/lib/staff-portal';

export const memberLinks = [
  { href: '/hub/elections', label: 'Elections', icon: IconElections },
  { href: '/hub/vault', label: 'Vault', icon: IconVault },
  { href: '/hub/wallet', label: 'Wallet', icon: IconWallet },
  { href: '/hub/notifications', label: 'Notifications', icon: IconBell },
  { href: '/hub/messages', label: 'Messages', icon: IconMessages },
  { href: '/hub/profile', label: 'Profile', icon: IconUser },
] as const;

export function navActive(pathname: string, href: string): boolean {
  return pathname === href || pathname?.startsWith(`${href}/`) === true;
}

type HubNavLinksProps = {
  pathname: string;
  user: AuthUser;
  greeting: ReturnType<typeof getHubGreeting>;
  isAdmin: boolean;
  isStaff: boolean;
  canIssuePins: boolean;
  onNavigate?: () => void;
  onLogout: () => void;
};

export default function HubNavLinks({
  pathname,
  user,
  greeting,
  isAdmin,
  isStaff,
  canIssuePins,
  onNavigate,
  onLogout,
}: HubNavLinksProps) {
  const displayName =
    user.first_name?.trim() ||
    user.display_name?.split(' ')[0] ||
    user.email?.split('@')[0] ||
    'Member';

  const navLinkClass = (active: boolean) =>
    active
      ? 'hub-nav-active flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold'
      : 'flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800';

  const links = isStaff
    ? staffElectionLinks.map(({ href, label }) => ({
        href,
        label,
        icon: IconElections,
      }))
    : memberLinks.map((link) => ({ ...link }));

  return (
    <>
      <nav className="flex-1 space-y-1 p-3">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          Menu
        </p>
        {links.map(({ href, label, icon: Icon }) => {
          const active = navActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={navLinkClass(active)}
            >
              <Icon
                className={active ? 'text-[var(--color-brand)]' : 'text-[var(--color-hub-muted)]'}
              />
              {label}
            </Link>
          );
        })}
        {canIssuePins && !isStaff && (
          <Link
            href="/hub/admin/pins"
            onClick={onNavigate}
            className={navLinkClass(navActive(pathname, '/hub/admin/pins'))}
          >
            <IconKey
              className={
                navActive(pathname, '/hub/admin/pins')
                  ? 'text-[var(--color-brand)]'
                  : 'text-[var(--color-hub-muted)]'
              }
            />
            Issue PINs
          </Link>
        )}
        {isAdmin && !isStaff && (
          <>
            <p className="mt-6 px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Chapter
            </p>
            <Link
              href="/hub/admin"
              onClick={onNavigate}
              className={navLinkClass(pathname?.startsWith('/hub/admin') === true)}
            >
              <IconAdmin
                className={
                  pathname?.startsWith('/hub/admin')
                    ? 'text-[var(--color-brand)]'
                    : 'text-[var(--color-hub-muted)]'
                }
              />
              Admin portal
            </Link>
          </>
        )}
      </nav>

      <div className="border-t border-[var(--color-hub-border)] p-3">
        <div className="rounded-xl bg-[var(--color-hub-surface-muted)] px-3 py-3">
          <p className="truncate text-sm font-semibold text-[var(--color-hub-text)]">
            {displayName}
          </p>
          <p className="truncate text-xs text-zinc-500">
            {user.matric_number && user.matric_number !== 'ADMIN001'
              ? user.matric_number
              : greeting.subtext ?? user.role}
          </p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="mt-2 flex min-h-[44px] w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-zinc-600 transition hover:bg-red-50 hover:text-red-700 dark:text-zinc-400 dark:hover:bg-red-950/30"
        >
          <IconLogout className="h-4 w-4" />
          Log out
        </button>
      </div>
    </>
  );
}
