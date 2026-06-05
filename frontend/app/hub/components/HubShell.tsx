'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { SpinnerCenter } from '@/app/components/Spinner';
import BrandLogo from '@/app/components/BrandLogo';
import { IconAdmin, IconElections, IconLogout } from '@/app/hub/components/ui/HubIcons';
import { getHubGreeting } from '@/lib/hub-greeting';
import { useAuth } from '@/lib/auth-context';

function navActive(pathname: string, href: string): boolean {
  return pathname === href || pathname?.startsWith(`${href}/`) === true;
}

const memberLinks = [
  { href: '/hub/elections', label: 'Elections', icon: IconElections },
];

export default function HubShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, isAdmin } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const greeting = getHubGreeting(user);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-hub-bg)]">
        <SpinnerCenter label="Loading The Hub…" />
      </div>
    );
  }

  if (!user) {
    router.replace('/hub/login');
    return null;
  }

  const displayName =
    user.first_name?.trim() ||
    user.display_name?.split(' ')[0] ||
    user.email?.split('@')[0] ||
    'Member';

  return (
    <div className="min-h-screen bg-[var(--color-hub-bg)]">
      <div className="mx-auto flex min-h-screen max-w-7xl">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-[var(--color-hub-border)] bg-[var(--color-hub-surface)]/95 backdrop-blur-sm lg:flex">
          <div className="flex h-16 items-center border-b border-[var(--color-hub-border)] px-5">
            <BrandLogo href="/hub/elections" label="Hub" size="sm" />
          </div>

          <nav className="flex-1 space-y-1 p-3">
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Menu
            </p>
            {memberLinks.map(({ href, label, icon: Icon }) => {
              const active = navActive(pathname ?? '', href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={
                    active
                      ? 'hub-nav-active flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold'
                      : 'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800'
                  }
                >
                  <Icon className={active ? 'text-[var(--color-brand)]' : 'text-[var(--color-hub-muted)]'} />
                  {label}
                </Link>
              );
            })}
            {isAdmin && (
              <>
                <p className="mt-6 px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Chapter
                </p>
                <Link
                  href="/hub/admin"
                  className={
                    pathname?.startsWith('/hub/admin')
                      ? 'hub-nav-active flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold'
                      : 'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-600 transition hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800'
                  }
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
              onClick={() => logout().then(() => router.push('/hub/login'))}
              className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-zinc-600 transition hover:bg-red-50 hover:text-red-700 dark:text-zinc-400 dark:hover:bg-red-950/30"
            >
              <IconLogout className="h-4 w-4" />
              Log out
            </button>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile header */}
          <header className="flex h-14 items-center justify-between border-b border-[var(--color-hub-border)] bg-[var(--color-hub-surface)]/95 px-4 backdrop-blur-sm lg:hidden">
            <BrandLogo href="/hub/elections" label="Hub" size="sm" />
            <div className="flex items-center gap-1">
              {memberLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={
                    navActive(pathname ?? '', href)
                      ? 'rounded-lg bg-[var(--color-brand-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--color-brand)]'
                      : 'rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-600'
                  }
                >
                  {label}
                </Link>
              ))}
              {isAdmin && (
                <Link
                  href="/hub/admin"
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-600"
                >
                  Admin
                </Link>
              )}
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="hub-card min-h-[calc(100vh-8rem)] p-5 sm:p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
