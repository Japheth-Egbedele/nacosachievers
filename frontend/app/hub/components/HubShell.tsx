'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SpinnerCenter } from '@/app/components/Spinner';
import BrandLogo from '@/app/components/BrandLogo';
import HubNavLinks from '@/app/hub/components/HubNavLinks';
import HubDrawer from '@/app/hub/components/ui/HubDrawer';
import { IconMenu } from '@/app/hub/components/ui/HubIcons';
import { getHubGreeting } from '@/lib/hub-greeting';
import { isStaffPortalPath } from '@/lib/staff-portal';
import { useAuth } from '@/lib/auth-context';

export default function HubShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, isAdmin, isStaff } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const greeting = getHubGreeting(user);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/hub/login');
      return;
    }
    if (!isAdmin && pathname?.startsWith('/hub/admin')) {
      router.replace('/hub/elections');
      return;
    }
    if (isStaff && pathname && !isStaffPortalPath(pathname)) {
      router.replace('/hub/elections');
    }
  }, [loading, user, isAdmin, isStaff, pathname, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-hub-bg)]">
        <SpinnerCenter label="Loading The Hub…" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  function closeMobileNav() {
    setMobileNavOpen(false);
  }

  function handleLogout() {
    closeMobileNav();
    void logout().then(() => router.push('/hub/login'));
  }

  const navProps = {
    pathname: pathname ?? '',
    user,
    greeting,
    isStaff,
    onLogout: handleLogout,
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--color-hub-bg)]">
      <div className="mx-auto flex min-h-screen max-w-7xl">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-[var(--color-hub-border)] bg-[var(--color-hub-surface)]/95 backdrop-blur-sm lg:flex">
          <div className="flex h-16 items-center border-b border-[var(--color-hub-border)] px-5">
            <BrandLogo href="/hub/elections" label="Hub" size="sm" />
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <HubNavLinks {...navProps} />
          </div>
        </aside>

        <HubDrawer open={mobileNavOpen} onClose={closeMobileNav} title="Hub menu">
          <div className="flex min-h-full flex-col">
            <HubNavLinks {...navProps} onNavigate={closeMobileNav} />
          </div>
        </HubDrawer>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[var(--color-hub-border)] bg-[var(--color-hub-surface)]/95 px-3 backdrop-blur-sm sm:px-4 lg:hidden">
            <BrandLogo href="/hub/elections" label="Hub" size="sm" />
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--color-hub-border)] text-zinc-700 transition hover:bg-[var(--color-hub-surface-muted)]"
            >
              <IconMenu className="h-5 w-5" />
            </button>
          </header>

          <main className="flex-1 overflow-x-hidden p-3 sm:p-6 lg:p-8">
            <div className="hub-card min-h-[calc(100dvh-4.5rem)] overflow-x-hidden p-4 sm:min-h-[calc(100vh-8rem)] sm:p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
