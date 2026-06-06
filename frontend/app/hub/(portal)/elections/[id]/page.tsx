'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ElectionResultsReport from '@/app/hub/components/elections/ElectionResultsReport';
import { SpinnerCenter } from '@/app/components/Spinner';
import HubAlert from '@/app/hub/components/ui/HubAlert';
import { IconChevronLeft } from '@/app/hub/components/ui/HubIcons';
import { hubBtnPrimary, hubLink } from '@/lib/hub-styles';
import type { ElectionPosition, ElectionResultsPayload } from '@/lib/election-types';
import { apiFetch, ApiClientError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface ElectionDetail {
  election: {
    id: string;
    title: string;
    status: string;
    start_date: string;
    end_date: string;
    require_all_positions: boolean;
  };
  positions: ElectionPosition[];
  contestable_positions: number;
  user_vote: string[] | null;
  ballot_locked: boolean;
  can_vote: boolean;
  results?: ElectionResultsPayload;
}

export default function ElectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isSuperAdmin } = useAuth();
  const [data, setData] = useState<ElectionDetail | null>(null);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    apiFetch<ElectionDetail>(`/elections/${id}`)
      .then((d) => {
        setData(d);
        if (d.user_vote?.length) {
          const map: Record<string, string> = {};
          for (const pos of d.positions) {
            const pick = pos.candidates.find((c) => d.user_vote!.includes(c.id));
            if (pick) map[pos.id] = pick.id;
          }
          setSelected(map);
        }
      })
      .catch((err) => {
        if (err instanceof ApiClientError && err.code === 'ELECTION_SCHEMA_INCOMPLETE') {
          setError(err.message);
        } else {
          setError(err instanceof ApiClientError ? err.message : 'Failed to load');
        }
        setData(null);
      });
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const contestable = useMemo(
    () => data?.positions.filter((p) => p.candidates.length > 0) ?? [],
    [data],
  );

  const selectedCount = useMemo(() => {
    return contestable.filter((p) => selected[p.id]).length;
  }, [contestable, selected]);

  const requiredCount = data?.election.require_all_positions
    ? contestable.length
    : Math.min(1, contestable.length);

  const canSubmit =
    data?.election.status === 'active' &&
    !data.ballot_locked &&
    (data.election.require_all_positions
      ? selectedCount === contestable.length && contestable.length > 0
      : selectedCount >= 1);

  if (!data) {
    if (error) {
      return (
        <div>
          <Link href="/hub/elections" className="hub-link inline-flex items-center gap-1 text-sm">
            <IconChevronLeft />
            All elections
          </Link>
          <HubAlert variant="error" className="mt-6">
            {error}
          </HubAlert>
        </div>
      );
    }
    return <SpinnerCenter label="Loading election…" />;
  }

  const { election, ballot_locked } = data;
  const canVote =
    data.can_vote !== false && !isSuperAdmin && election.status === 'active' && !ballot_locked;
  const showResults = election.status === 'completed';

  function toggleSelect(positionId: string, candidateId: string) {
    setSelected((prev) => ({ ...prev, [positionId]: candidateId }));
  }

  async function submitVote() {
    const candidateIds = Object.values(selected);
    setBusy(true);
    setError('');
    setConfirmOpen(false);
    try {
      await apiFetch(`/elections/${id}/vote`, {
        method: 'POST',
        body: JSON.stringify({ candidate_ids: candidateIds }),
      });
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Vote failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Link
        href="/hub/elections"
        className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 transition hover:text-emerald-900"
      >
        <IconChevronLeft />
        All elections
      </Link>
      <h1 className="hub-display mt-4 text-3xl text-zinc-900 dark:text-white">{election.title}</h1>
      <p className="mt-2 inline-flex rounded-full bg-emerald-50 px-3 py-0.5 text-xs font-bold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200">
        {election.status === 'active' ? 'Live' : election.status}
      </p>

      {isSuperAdmin && (
        <HubAlert variant="info" className="mt-6">
          Super admin accounts manage the chapter but cannot vote. Use a student member account to
          cast a ballot.
        </HubAlert>
      )}

      {ballot_locked && !isSuperAdmin && (
        <HubAlert variant="success" className="mt-6">
          Your ballot has been submitted and locked. You cannot change your choices. Results will be
          published when voting closes.
        </HubAlert>
      )}

      {error && <HubAlert variant="error" className="mt-4">{error}</HubAlert>}

      {canVote && (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Select <strong>one contestant per position</strong>
            {election.require_all_positions
              ? ` (${requiredCount} positions).`
              : ' (at least one).'}{' '}
            Review your choices, then submit once — your ballot will lock.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{
                  width: `${contestable.length ? (selectedCount / contestable.length) * 100 : 0}%`,
                }}
              />
            </div>
            <span className="text-sm font-medium tabular-nums">
              {selectedCount} / {contestable.length}
            </span>
          </div>
        </div>
      )}

      {canVote && (
        <div className="mt-8 space-y-8">
          {contestable.map((pos) => (
            <section key={pos.id}>
              <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
                {pos.title}
              </h2>
              <ul className="mt-3 space-y-2">
                {pos.candidates.map((c) => (
                  <li key={c.id}>
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 p-4 transition has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50 dark:border-zinc-700 dark:has-[:checked]:bg-emerald-950/30">
                      <input
                        type="radio"
                        name={`position-${pos.id}`}
                        checked={selected[pos.id] === c.id}
                        onChange={() => toggleSelect(pos.id, c.id)}
                        className="mt-1"
                      />
                      <div>
                        <span className="font-medium">{c.name}</span>
                        {c.manifesto && (
                          <p className="mt-1 text-sm text-zinc-500">{c.manifesto}</p>
                        )}
                      </div>
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {contestable.length === 0 && (
            <p className="text-sm text-zinc-500">No positions open for voting yet.</p>
          )}

          <button
            type="button"
            disabled={!canSubmit || busy}
            onClick={() => setConfirmOpen(true)}
            className={`${hubBtnPrimary} w-auto px-8`}
          >
            Review & submit ballot
          </button>
        </div>
      )}

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-md w-full rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
            <h3 className="text-lg font-bold">Confirm your ballot</h3>
            <p className="mt-2 text-sm text-zinc-600">
              You cannot change these choices after submitting.
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              {contestable.map((pos) => {
                const cid = selected[pos.id];
                const name = pos.candidates.find((c) => c.id === cid)?.name ?? '—';
                return (
                  <li key={pos.id}>
                    <span className="text-zinc-500">{pos.title}:</span>{' '}
                    <strong>{name}</strong>
                  </li>
                );
              })}
            </ul>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="flex-1 rounded-lg border py-2 text-sm dark:border-zinc-700"
              >
                Go back
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => submitVote()}
                className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white"
              >
                {busy ? 'Submitting…' : 'Submit & lock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showResults && data.results && (
        <div className="mt-10">
          <ElectionResultsReport
            electionTitle={election.title}
            electionId={election.id}
            positions={data.results.positions}
            analytics={data.results.analytics}
          />
        </div>
      )}
    </div>
  );
}
