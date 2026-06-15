'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ElectionResultsReport from '@/app/hub/components/elections/ElectionResultsReport';
import CandidatePhoto from '@/app/hub/components/elections/CandidatePhoto';
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
  user_vote: { candidate_ids: string[]; abstained_position_ids: string[] } | null;
  ballot_locked: boolean;
  can_vote: boolean;
  results?: ElectionResultsPayload;
}

type PositionPick = { kind: 'candidate'; id: string } | { kind: 'abstain' };

export default function ElectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isSuperAdmin, isStaff } = useAuth();
  const [data, setData] = useState<ElectionDetail | null>(null);
  const [selected, setSelected] = useState<Record<string, PositionPick>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    apiFetch<ElectionDetail>(`/elections/${id}`)
      .then((d) => {
        setData(d);
        if (d.user_vote) {
          const map: Record<string, PositionPick> = {};
          for (const pos of d.positions) {
            if (d.user_vote.abstained_position_ids.includes(pos.id)) {
              map[pos.id] = { kind: 'abstain' };
              continue;
            }
            const pick = pos.candidates.find((c) => d.user_vote!.candidate_ids.includes(c.id));
            if (pick) map[pos.id] = { kind: 'candidate', id: pick.id };
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
    return contestable.filter((p) => selected[p.id] !== undefined).length;
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

  function pickCandidate(positionId: string, candidateId: string) {
    setSelected((prev) => ({ ...prev, [positionId]: { kind: 'candidate', id: candidateId } }));
  }

  function pickAbstain(positionId: string) {
    setSelected((prev) => ({ ...prev, [positionId]: { kind: 'abstain' } }));
  }

  async function submitVote() {
    const selections = contestable.map((pos) => {
      const pick = selected[pos.id];
      if (!pick) {
        throw new Error('Incomplete ballot');
      }
      if (pick.kind === 'abstain') {
        return { position_id: pos.id, choice: 'abstain' as const };
      }
      return {
        position_id: pos.id,
        choice: 'candidate' as const,
        candidate_id: pick.id,
      };
    });
    setBusy(true);
    setError('');
    setConfirmOpen(false);
    try {
      await apiFetch(`/elections/${id}/vote`, {
        method: 'POST',
        body: JSON.stringify({ selections }),
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

      {isStaff && election.status === 'active' && (
        <HubAlert variant="info" className="mt-6">
          Lecturers can view results after voting closes. You cannot cast a ballot in chapter
          elections.
        </HubAlert>
      )}

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
            Respond to <strong>every position</strong> — pick a contestant or choose{' '}
            <strong>None of the above</strong>
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
                    <label className="flex cursor-pointer items-start gap-4 rounded-xl border border-zinc-200 p-4 transition has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50 dark:border-zinc-700 dark:has-[:checked]:bg-emerald-950/30">
                      <input
                        type="radio"
                        name={`position-${pos.id}`}
                        checked={
                          (() => {
                            const pick = selected[pos.id];
                            return pick?.kind === 'candidate' && pick.id === c.id;
                          })()
                        }
                        onChange={() => pickCandidate(pos.id, c.id)}
                        className="mt-5 shrink-0"
                      />
                      <CandidatePhoto name={c.name} imageUrl={c.image_url} size="md" className="mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <span className="font-medium">{c.name}</span>
                        {c.manifesto && (
                          <p className="mt-1 text-sm text-zinc-500">{c.manifesto}</p>
                        )}
                      </div>
                    </label>
                  </li>
                ))}
                <li>
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-dashed border-zinc-300 p-4 transition has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50 dark:border-zinc-600 dark:has-[:checked]:bg-amber-950/20">
                    <input
                      type="radio"
                      name={`position-${pos.id}`}
                      checked={selected[pos.id]?.kind === 'abstain'}
                      onChange={() => pickAbstain(pos.id)}
                      className="mt-1"
                    />
                    <div>
                      <span className="font-medium">None of the above</span>
                      <p className="mt-1 text-sm text-zinc-500">
                        Abstain from this position — your ballot still counts.
                      </p>
                    </div>
                  </label>
                </li>
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
            <ul className="mt-4 space-y-3 text-sm">
              {contestable.map((pos) => {
                const pick = selected[pos.id];
                const candidate =
                  pick?.kind === 'candidate'
                    ? pos.candidates.find((c) => c.id === pick.id)
                    : null;
                const name =
                  pick?.kind === 'abstain'
                    ? 'None of the above'
                    : (candidate?.name ?? '—');
                return (
                  <li key={pos.id} className="flex items-center gap-3">
                    {candidate ? (
                      <CandidatePhoto name={candidate.name} imageUrl={candidate.image_url} size="sm" />
                    ) : (
                      <div className="h-12 w-12 shrink-0 rounded-full bg-zinc-100 dark:bg-zinc-800" />
                    )}
                    <div>
                      <span className="text-zinc-500">{pos.title}:</span>{' '}
                      <strong>{name}</strong>
                    </div>
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
