'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { SpinnerCenter } from '@/app/components/Spinner';
import { IconChevronLeft } from '@/app/hub/components/ui/HubIcons';
import { filterAdminNav } from '@/lib/admin-nav';
import { useAuth } from '@/lib/auth-context';

function navActive(pathname: string, href: string): boolean {
  if (href === '/hub/admin') return pathname === '/hub/admin';
  return pathname === href || pathname?.startsWith(`${href}/`) === true;
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { loading, isAdmin, isSuperAdmin, canIssuePins } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const pinOnlyIssuer = canIssuePins && !isAdmin;
  const links = filterAdminNav(isSuperAdmin, canIssuePins, isAdmin);
  const canAccessAdmin = isAdmin || canIssuePins;

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

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <aside className="w-full shrink-0 lg:w-56">
        <div className="rounded-2xl border border-[var(--color-hub-border)] bg-[var(--color-hub-surface-muted)] p-3">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Administration
          </p>
          <nav className="flex flex-col gap-0.5">
            {links.map((item) => {
              const active = navActive(pathname ?? '', item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    active
                      ? 'hub-nav-active rounded-xl px-3 py-2 text-sm font-semibold'
                      : 'rounded-xl px-3 py-2 text-sm text-zinc-600 transition hover:bg-white hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800'
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <Link
            href="/hub/elections"
            className="mt-4 flex items-center gap-1 border-t border-[var(--color-hub-border)] px-3 pt-3 text-xs font-medium text-[var(--color-hub-text-secondary)] transition hover:text-[var(--color-brand)]"
          >
            <IconChevronLeft />
            Back to elections
          </Link>
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
