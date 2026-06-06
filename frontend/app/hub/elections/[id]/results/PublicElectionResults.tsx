'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SpinnerCenter } from '@/app/components/Spinner';
import ElectionResultsReport from '@/app/hub/components/elections/ElectionResultsReport';
import HubAlert from '@/app/hub/components/ui/HubAlert';
import { API_BASE } from '@/lib/api';
import type { ElectionAnalytics, ElectionPosition } from '@/lib/election-types';

type PublicResultsPayload = {
  election: {
    id: string;
    title: string;
    status: string;
  };
  positions: ElectionPosition[];
  analytics: ElectionAnalytics;
};

export default function PublicElectionResults({
  id,
  initialData,
}: {
  id: string;
  initialData: PublicResultsPayload | null;
}) {
  const [data, setData] = useState<PublicResultsPayload | null>(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) return;
    let active = true;
    void (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/elections/${id}/public-results`, {
          credentials: 'omit',
        });
        const json = (await res.json()) as {
          success: boolean;
          data?: PublicResultsPayload;
          error?: string;
        };
        if (!active) return;
        if (!res.ok || !json.success || !json.data) {
          setError(json.error ?? 'Results are not available yet.');
          setData(null);
        } else {
          setData(json.data);
        }
      } catch {
        if (active) {
          setError('Could not load results.');
          setData(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id, initialData]);

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/hub/elections/${id}/results`
      : `/hub/elections/${id}/results`;

  return (
    <div className="min-h-screen bg-[var(--color-hub-bg)]">
      <header className="border-b border-[var(--color-hub-border)] bg-[var(--color-hub-surface)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="inline-flex items-center gap-3">
            <Image src="/image.png" alt="NACOS" width={40} height={40} className="h-10 w-10 rounded-lg object-contain" />
            <span className="hub-display text-lg text-[var(--color-hub-text)]">NACOS Achievers</span>
          </Link>
          <Link href="/hub/login" className="hub-link text-sm">
            Enter The Hub
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        {loading && <SpinnerCenter label="Loading results…" />}
        {!loading && error && <HubAlert variant="error">{error}</HubAlert>}
        {!loading && data && (
          <ElectionResultsReport
            electionTitle={data.election.title}
            electionId={data.election.id}
            positions={data.positions}
            analytics={data.analytics}
            shareUrl={shareUrl}
          />
        )}
      </main>
    </div>
  );
}
