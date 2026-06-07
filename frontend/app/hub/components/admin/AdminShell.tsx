'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SpinnerCenter } from '@/app/components/Spinner';
import HubDrawer from '@/app/hub/components/ui/HubDrawer';
import { IconChevronLeft, IconMenu } from '@/app/hub/components/ui/HubIcons';
import { filterAdminNav } from '@/lib/admin-nav';
import type { AdminScope } from '@/lib/executive-offices';
import { hubBtnSecondary } from '@/lib/hub-styles';
import { useAuth } from '@/lib/auth-context';

function navActive(pathname: string, href: string): boolean {
  if (href === '/hub/admin') return pathname === '/hub/admin';
  return pathname === href || pathname?.startsWith(`${href}/`) === true;
}

function AdminNavList({
  links,
  pathname,
  onNavigate,
}: {
  links: ReturnType<typeof filterAdminNav>;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-0.5 p-3">
      {links.map((item) => {
        const active = navActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={
              active
                ? 'hub-nav-active flex min-h-[44px] items-center rounded-xl px-3 py-2 text-sm font-semibold'
                : 'flex min-h-[44px] items-center rounded-xl px-3 py-2 text-sm text-zinc-600 transition hover:bg-white hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }
          >
            {item.label}
          </Link>
        );
      })}
      <Link
        href="/hub/elections"
        onClick={onNavigate}
        className="mt-4 flex min-h-[44px] items-center gap-1 border-t border-[var(--color-hub-border)] px-3 pt-3 text-xs font-medium text-[var(--color-hub-text-secondary)] transition hover:text-[var(--color-brand)]"
      >
        <IconChevronLeft />
        Back to elections
      </Link>
    </nav>
  );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { loading, isAdmin, isSuperAdmin, canIssuePins, user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pinOnlyIssuer = canIssuePins && !isAdmin;
  const adminScopes = (user?.admin_scopes ?? []) as AdminScope[];
  const links = filterAdminNav(isSuperAdmin, canIssuePins, isAdmin, adminScopes);
  const canAccessAdmin = isAdmin || canIssuePins;
  const activeLabel = links.find((item) => navActive(pathname ?? '', item.href))?.label ?? 'Admin';

  useEffect(() => {
    if (loading || !pinOnlyIssuer || !pathname) return;
    const onPins =
      pathname === '/hub/admin/pins' || pathname.startsWith('/hub/admin/pins/');
    if (!onPins) router.replace('/hub/admin/pins');
  }, [loading, pinOnlyIssuer, pathname, router]);

  if (loading) {
    return <SpinnerCenter label="Loading admin…" />;
  }

  if (!canAccessAdmin) {
    router.replace('/hub/elections');
    return null;
  }

  function closeMobileNav() {
    setMobileNavOpen(false);
  }

  return (
    <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
      <aside className="hidden w-full shrink-0 lg:block lg:w-56">
        <div className="rounded-2xl border border-[var(--color-hub-border)] bg-[var(--color-hub-surface-muted)] p-3">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Administration
          </p>
          <AdminNavList links={links} pathname={pathname ?? ''} />
        </div>
      </aside>

      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          aria-expanded={mobileNavOpen}
          className={`${hubBtnSecondary} w-full justify-between gap-3 px-4`}
        >
          <span className="truncate text-left">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Administration
            </span>
            <span className="font-semibold text-[var(--color-hub-text)]">{activeLabel}</span>
          </span>
          <IconMenu className="h-5 w-5 shrink-0" />
        </button>
      </div>

      <HubDrawer open={mobileNavOpen} onClose={closeMobileNav} title="Admin menu">
        <AdminNavList links={links} pathname={pathname ?? ''} onNavigate={closeMobileNav} />
      </HubDrawer>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
