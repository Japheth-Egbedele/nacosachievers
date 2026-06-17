'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { SpinnerCenter } from '@/app/components/Spinner';
import HubAlert from '@/app/hub/components/ui/HubAlert';
import HubPageHeader from '@/app/hub/components/ui/HubPageHeader';
import ElectionCountdown from '@/app/hub/components/elections/ElectionCountdown';
import { minStartDatetimeLocal } from '@/lib/election-countdown';
import AdminStatTile from '@/app/hub/components/admin/AdminStatTile';
import { apiFetch, ApiClientError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface Election {
  id: string;
  title: string;
  status: string;
  start_date: string;
  end_date: string;
  vote_count?: number;
}

interface LiveStats {
  stats: {
    total_users: number;
    total_elections: number;
    active_elections: number;
    total_votes: number;
  };
  recent_voters: Array<{
    full_name: string | null;
    student_id: string | null;
    voted_at: string;
    election_title: string | null;
  }>;
}

export default function AdminElectionsPage() {
  const { isAdmin, loading } = useAuth();
  const router = useRouter();
  const [elections, setElections] = useState<Election[]>([]);
  const [liveStats, setLiveStats] = useState<LiveStats | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [dataLoading, setDataLoading] = useState(true);

  const hasActiveElections = elections.some((e) => e.status === 'active');

  const loadElections = useCallback(() => {
    setDataLoading(true);
    apiFetch<{ elections: Election[] }>('/admin/elections')
      .then((d) => setElections(d.elections))
      .catch(() => setElections([]))
      .finally(() => setDataLoading(false));
  }, []);

  const loadStats = useCallback(() => {
    apiFetch<LiveStats>('/admin/elections/stats')
      .then(setLiveStats)
      .catch(() => setLiveStats(null));
  }, []);

  useEffect(() => {
    if (!loading && !isAdmin) router.replace('/hub/elections');
  }, [loading, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return;
    const t = window.setTimeout(() => loadElections(), 0);
    return () => window.clearTimeout(t);
  }, [isAdmin, loadElections]);

  useEffect(() => {
    if (!isAdmin || !hasActiveElections) return;
    loadStats();
    const timer = window.setInterval(loadStats, 30_000);
    return () => window.clearInterval(timer);
  }, [isAdmin, hasActiveElections, loadStats]);

  async function createElection(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const start = new Date(startDate).toISOString();
      const end = new Date(endDate).toISOString();
      await apiFetch('/admin/elections', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description: description || undefined,
          start_date: start,
          end_date: end,
        }),
      });
      setShowForm(false);
      setTitle('');
      setDescription('');
      setStartDate('');
      setEndDate('');
      loadElections();
      loadStats();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to create');
    }
  }

  if (loading || !isAdmin) return null;
  if (dataLoading) return <SpinnerCenter label="Loading elections…" />;

  return (
    <div>
      <HubPageHeader
        title="Manage elections"
        description="Create elections, add positions and candidates, and monitor live turnout."
        action={
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="hub-btn-primary inline-flex w-auto rounded-xl px-4 py-2 text-sm font-semibold"
          >
            {showForm ? 'Cancel' : 'New election'}
          </button>
        }
      />

      {hasActiveElections && liveStats && (
        <section className="mb-8 space-y-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-brand)] opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--color-brand)]" />
            </span>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-hub-muted)]">
              Live stats · refreshes every 30s
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <AdminStatTile label="Active elections" value={String(liveStats.stats.active_elections)} />
            <AdminStatTile label="Total votes" value={String(liveStats.stats.total_votes)} />
            <AdminStatTile label="Eligible members" value={String(liveStats.stats.total_users)} />
            <AdminStatTile label="All elections" value={String(liveStats.stats.total_elections)} />
          </div>
          {liveStats.recent_voters.length > 0 && (
            <div className="hub-card-muted p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-hub-muted)]">
                Recent ballots
              </p>
              <ul className="mt-3 space-y-2">
                {liveStats.recent_voters.slice(0, 5).map((v, i) => (
                  <li
                    key={`${v.voted_at}-${i}`}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm"
                  >
                    <span className="font-medium text-[var(--color-hub-text)]">
                      {v.full_name ?? 'Member'}
                      {v.student_id && (
                        <span className="ml-2 font-mono text-xs text-[var(--color-hub-muted)]">
                          {v.student_id}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-[var(--color-hub-text-secondary)]">
                      {v.election_title ?? 'Election'} · {new Date(v.voted_at).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {showForm && (
        <form onSubmit={createElection} className="hub-card mb-8 max-w-lg space-y-4 p-6">
          {error && <HubAlert variant="error">{error}</HubAlert>}
          <input
            placeholder="Title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="hub-input w-full rounded-xl px-3.5 py-2.5 text-sm"
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="hub-input w-full rounded-xl px-3.5 py-2.5 text-sm"
          />
          <div>
            <label className="text-sm font-medium">Start</label>
            <input
              type="datetime-local"
              required
              min={minStartDatetimeLocal()}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="hub-input mt-1 w-full rounded-xl px-3.5 py-2.5 text-sm"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Must be at least 24 hours from now. Countdown appears the day before voting opens.
            </p>
          </div>
          <div>
            <label className="text-sm font-medium">End</label>
            <input
              type="datetime-local"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="hub-input mt-1 w-full rounded-xl px-3.5 py-2.5 text-sm"
            />
          </div>
          <button type="submit" className="hub-btn-primary rounded-xl px-4 py-2 text-sm font-semibold">
            Create
          </button>
        </form>
      )}

      <ul className="space-y-3">
        {elections.map((e) => (
          <li key={e.id} className="hub-list-card">
            <div>
              <p className="font-medium text-[var(--color-hub-text)]">{e.title}</p>
              <p className="text-xs text-[var(--color-hub-text-secondary)]">
                <span
                  className={
                    e.status === 'active'
                      ? 'font-semibold text-[var(--color-brand)]'
                      : 'capitalize'
                  }
                >
                  {e.status}
                </span>
                {' · '}
                {e.vote_count ?? 0} votes
              </p>
              {(e.status === 'upcoming' || e.status === 'active' || e.status === 'completed') && (
                <div className="mt-2">
                  <ElectionCountdown startDate={e.start_date} endDate={e.end_date} size="sm" />
                </div>
              )}
            </div>
            <Link href={`/hub/admin/elections/${e.id}`} className="hub-link text-sm">
              Manage →
            </Link>
          </li>
        ))}
        {elections.length === 0 && (
          <p className="hub-empty-state">No elections yet. Create one to get started.</p>
        )}
      </ul>
    </div>
  );
}
