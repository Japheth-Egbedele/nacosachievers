'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SpinnerCenter } from '@/app/components/Spinner';
import { useAuth } from '@/lib/auth-context';

/** Admins may use dashboard shortcuts; members go straight to elections. */
export default function DashboardPage() {
  const { isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!isAdmin) {
      router.replace('/hub/elections');
    }
  }, [loading, isAdmin, router]);

  if (loading || !isAdmin) {
    return <SpinnerCenter />;
  }

  return (
    <div className="text-center py-12">
      <p className="text-sm text-zinc-500">Redirecting to admin…</p>
    </div>
  );
}
