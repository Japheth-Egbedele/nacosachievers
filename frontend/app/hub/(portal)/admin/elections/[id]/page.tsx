'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import ElectionResultsReport from '@/app/hub/components/elections/ElectionResultsReport';
import CandidatePhoto from '@/app/hub/components/elections/CandidatePhoto';
import { SpinnerCenter } from '@/app/components/Spinner';
import type { ElectionAnalytics, ElectionPosition } from '@/lib/election-types';
import { apiFetch, ApiClientError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface SetupData {
  election: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    start_date: string;
    end_date: string;
    require_all_positions: boolean;
  };
  positions: ElectionPosition[];
  can_edit_structure: boolean;
}

interface ResultsData {
  election: SetupData['election'];
  positions: ElectionPosition[];
  analytics: ElectionAnalytics;
}

export default function AdminElectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin, loading } = useAuth();
  const router = useRouter();
  const [setup, setSetup] = useState<SetupData | null>(null);
  const [results, setResults] = useState<ResultsData | null>(null);
  const [resultsBlocked, setResultsBlocked] = useState(false);
  const [liveConfirmOpen, setLiveConfirmOpen] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'setup' | 'results'>('setup');

  const [newPosition, setNewPosition] = useState('');
  const [editingPosition, setEditingPosition] = useState<string | null>(null);
  const [editPositionTitle, setEditPositionTitle] = useState('');
  const [contestantForms, setContestantForms] = useState<
    Record<string, { name: string; manifesto: string; photo: File | null; photoPreview: string | null }>
  >({});

  const loadSetup = useCallback(() => {
    if (!id) return;
    apiFetch<SetupData>(`/admin/elections/${id}`)
      .then(setSetup)
      .catch(() => setSetup(null));
  }, [id]);

  const loadResults = useCallback((acknowledgeLive = false) => {
    if (!id) return;
    const qs = acknowledgeLive ? '?acknowledge_live_results=true' : '';
    apiFetch<ResultsData>(`/admin/elections/${id}/results${qs}`)
      .then((data) => {
        setResults(data);
        setResultsBlocked(false);
      })
      .catch((err) => {
        if (err instanceof ApiClientError && err.code === 'LIVE_RESULTS_BLOCKED') {
          setResults(null);
          setResultsBlocked(true);
          return;
        }
        setResults(null);
        setResultsBlocked(false);
      });
  }, [id]);

  useEffect(() => {
    if (!loading && !isAdmin) router.replace('/hub/elections');
  }, [loading, isAdmin, router]);

  useEffect(() => {
    if (isAdmin && id) {
      loadSetup();
      loadResults();
    }
  }, [isAdmin, id, loadSetup, loadResults]);

  useEffect(() => {
    if (setup?.election.status === 'completed') setTab('results');
  }, [setup?.election.status]);

  async function toggleRequireAll(checked: boolean) {
    if (!id || !setup?.can_edit_structure) return;
    setError('');
    try {
      await apiFetch(`/admin/elections/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ require_all_positions: checked }),
      });
      loadSetup();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Update failed');
    }
  }

  async function addPosition(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !newPosition.trim()) return;
    setError('');
    try {
      await apiFetch(`/admin/elections/${id}/positions`, {
        method: 'POST',
        body: JSON.stringify({ title: newPosition.trim(), sort_order: setup?.positions.length ?? 0 }),
      });
      setNewPosition('');
      loadSetup();
      loadResults();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to add position');
    }
  }

  async function savePositionTitle(positionId: string) {
    setError('');
    try {
      await apiFetch(`/admin/elections/positions/${positionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: editPositionTitle.trim() }),
      });
      setEditingPosition(null);
      loadSetup();
      loadResults();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to update position');
    }
  }

  async function removePosition(positionId: string) {
    if (!confirm('Delete this position and all its contestants?')) return;
    setError('');
    try {
      await apiFetch(`/admin/elections/positions/${positionId}`, { method: 'DELETE' });
      loadSetup();
      loadResults();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to delete position');
    }
  }

  const contestantFormsRef = useRef(contestantForms);
  contestantFormsRef.current = contestantForms;

  useEffect(() => {
    return () => {
      for (const form of Object.values(contestantFormsRef.current)) {
        if (form.photoPreview) URL.revokeObjectURL(form.photoPreview);
      }
    };
  }, []);

  async function addContestant(positionId: string, e: React.FormEvent) {
    e.preventDefault();
    const form = contestantForms[positionId];
    if (!id || !form?.name.trim()) return;
    setError('');
    try {
      const fd = new FormData();
      fd.append('position_id', positionId);
      fd.append('name', form.name.trim());
      if (form.manifesto.trim()) fd.append('manifesto', form.manifesto.trim());
      if (form.photo) fd.append('photo', form.photo);
      await apiFetch(`/admin/elections/${id}/candidates`, {
        method: 'POST',
        body: fd,
      });
      if (form.photoPreview) URL.revokeObjectURL(form.photoPreview);
      setContestantForms((prev) => ({
        ...prev,
        [positionId]: { name: '', manifesto: '', photo: null, photoPreview: null },
      }));
      loadSetup();
      loadResults();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to add contestant');
    }
  }

  async function updateContestantPhoto(candidateId: string, file: File) {
    setError('');
    try {
      const fd = new FormData();
      fd.append('photo', file);
      await apiFetch(`/admin/elections/candidates/${candidateId}`, {
        method: 'PATCH',
        body: fd,
      });
      loadSetup();
      loadResults();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to update photo');
    }
  }

  async function removeContestantPhoto(candidateId: string) {
    if (!confirm('Remove this contestant photo?')) return;
    setError('');
    try {
      const fd = new FormData();
      fd.append('remove_photo', 'true');
      await apiFetch(`/admin/elections/candidates/${candidateId}`, {
        method: 'PATCH',
        body: fd,
      });
      loadSetup();
      loadResults();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to remove photo');
    }
  }

  async function removeContestant(candidateId: string) {
    if (!confirm('Remove this contestant?')) return;
    setError('');
    try {
      await apiFetch(`/admin/elections/candidates/${candidateId}`, { method: 'DELETE' });
      loadSetup();
      loadResults();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to remove contestant');
    }
  }

  if (loading || !isAdmin) return null;
  if (!setup) return <SpinnerCenter label="Loading election…" />;

  const { election, can_edit_structure } = setup;
  const statusStyles: Record<string, string> = {
    upcoming: 'bg-amber-100 text-amber-900',
    active: 'bg-green-100 text-green-900',
    completed: 'bg-zinc-200 text-zinc-700',
  };

  return (
    <div>
      <Link href="/hub/admin/elections" className="text-sm text-emerald-600 hover:underline">
        ← Elections
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{election.title}</h1>
          {election.description && (
            <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
              {election.description}
            </p>
          )}
          <p className="mt-2 text-xs text-zinc-500">
            {formatRange(election.start_date, election.end_date)}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${statusStyles[election.status] ?? ''}`}
        >
          {election.status}
        </span>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40">
          {error}
        </p>
      )}

      {!can_edit_structure && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30">
          This election is {election.status}. Positions and contestants cannot be changed. Voters
          pick one contestant per position; ballots lock after submit.
        </p>
      )}

      <div className="mt-6 flex gap-2">
        <TabButton active={tab === 'setup'} onClick={() => setTab('setup')}>
          Setup
        </TabButton>
        <TabButton active={tab === 'results'} onClick={() => setTab('results')}>
          Results & analytics
        </TabButton>
      </div>

      {tab === 'setup' && (
        <div className="mt-8 space-y-8">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="font-semibold">Ballot rules</h2>
            <label className="mt-3 flex cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={election.require_all_positions}
                disabled={!can_edit_structure}
                onChange={(e) => toggleRequireAll(e.target.checked)}
                className="rounded border-zinc-300"
              />
              <span>
                Voters must select one contestant for <strong>every</strong> position that has
                contestants (recommended)
              </span>
            </label>
          </div>

          {can_edit_structure && (
            <form onSubmit={addPosition} className="flex flex-wrap gap-2">
              <input
                value={newPosition}
                onChange={(e) => setNewPosition(e.target.value)}
                placeholder="New position title (e.g. President)"
                className="min-w-[14rem] flex-1 rounded-lg border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                required
              />
              <button
                type="submit"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
              >
                Add position
              </button>
            </form>
          )}

          <div className="space-y-6">
            {setup.positions.map((pos) => (
              <section
                key={pos.id}
                className="rounded-2xl border border-emerald-200/60 bg-white dark:border-emerald-900/50 dark:bg-zinc-900"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
                  {editingPosition === pos.id ? (
                    <div className="flex flex-1 gap-2">
                      <input
                        value={editPositionTitle}
                        onChange={(e) => setEditPositionTitle(e.target.value)}
                        className="flex-1 rounded-lg border px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                      />
                      <button
                        type="button"
                        onClick={() => savePositionTitle(pos.id)}
                        className="text-sm text-emerald-600"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingPosition(null)}
                        className="text-sm text-zinc-500"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <h3 className="text-lg font-semibold">{pos.title}</h3>
                  )}
                  {can_edit_structure && editingPosition !== pos.id && (
                    <div className="flex gap-3 text-sm">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPosition(pos.id);
                          setEditPositionTitle(pos.title);
                        }}
                        className="text-emerald-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => removePosition(pos.id)}
                        className="text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                <ul className="divide-y divide-zinc-50 dark:divide-zinc-800">
                  {pos.candidates.map((c) => (
                    <li
                      key={c.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <CandidatePhoto name={c.name} imageUrl={c.image_url} size="sm" />
                        <span className="font-medium">{c.name}</span>
                      </div>
                      {can_edit_structure && (
                        <div className="flex flex-wrap items-center gap-3">
                          <label className="cursor-pointer text-emerald-600 hover:underline">
                            {c.image_url ? 'Change photo' : 'Add photo'}
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="sr-only"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                e.target.value = '';
                                if (file) void updateContestantPhoto(c.id, file);
                              }}
                            />
                          </label>
                          {c.image_url && (
                            <button
                              type="button"
                              onClick={() => removeContestantPhoto(c.id)}
                              className="text-zinc-500 hover:underline"
                            >
                              Remove photo
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeContestant(c.id)}
                            className="text-red-600 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                  {pos.candidates.length === 0 && (
                    <li className="px-5 py-4 text-sm text-zinc-500">No contestants yet</li>
                  )}
                </ul>

                {can_edit_structure && (
                  <form
                    onSubmit={(e) => addContestant(pos.id, e)}
                    className="border-t border-zinc-100 px-5 py-4 dark:border-zinc-800"
                  >
                    <p className="mb-2 text-xs font-medium uppercase text-zinc-500">
                      Add contestant under {pos.title}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <input
                        value={contestantForms[pos.id]?.name ?? ''}
                        onChange={(e) =>
                          setContestantForms((prev) => ({
                            ...prev,
                            [pos.id]: {
                              name: e.target.value,
                              manifesto: prev[pos.id]?.manifesto ?? '',
                              photo: prev[pos.id]?.photo ?? null,
                              photoPreview: prev[pos.id]?.photoPreview ?? null,
                            },
                          }))
                        }
                        placeholder="Full name"
                        className="min-w-[10rem] flex-1 rounded-lg border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                        required
                      />
                      <input
                        value={contestantForms[pos.id]?.manifesto ?? ''}
                        onChange={(e) =>
                          setContestantForms((prev) => ({
                            ...prev,
                            [pos.id]: {
                              name: prev[pos.id]?.name ?? '',
                              manifesto: e.target.value,
                              photo: prev[pos.id]?.photo ?? null,
                              photoPreview: prev[pos.id]?.photoPreview ?? null,
                            },
                          }))
                        }
                        placeholder="Manifesto (optional)"
                        className="min-w-[12rem] flex-[2] rounded-lg border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                      />
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-sm text-zinc-600 dark:border-zinc-600 dark:text-zinc-400">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="sr-only"
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null;
                            e.target.value = '';
                            setContestantForms((prev) => {
                              const current = prev[pos.id] ?? {
                                name: '',
                                manifesto: '',
                                photo: null,
                                photoPreview: null,
                              };
                              if (current.photoPreview) URL.revokeObjectURL(current.photoPreview);
                              return {
                                ...prev,
                                [pos.id]: {
                                  ...current,
                                  photo: file,
                                  photoPreview: file ? URL.createObjectURL(file) : null,
                                },
                              };
                            });
                          }}
                        />
                        {contestantForms[pos.id]?.photoPreview ? (
                          <img
                            src={contestantForms[pos.id]!.photoPreview!}
                            alt="Preview"
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <span>Photo (optional)</span>
                        )}
                      </label>
                      <button
                        type="submit"
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white"
                      >
                        Add
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-zinc-500">
                      JPEG, PNG, or WebP · max 5 MB · square photos work best
                    </p>
                  </form>
                )}
              </section>
            ))}
            {setup.positions.length === 0 && (
              <p className="rounded-xl border border-dashed p-8 text-center text-sm text-zinc-500">
                Add positions first, then add contestants under each position before the start time.
              </p>
            )}
          </div>
        </div>
      )}

      {tab === 'results' && resultsBlocked && (
        <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/30">
          <p className="text-sm text-amber-900 dark:text-amber-100">
            This election is still live. Provisional tallies can influence voters — confirm to view
            live results.
          </p>
          <button
            type="button"
            onClick={() => setLiveConfirmOpen(true)}
            className="mt-4 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white"
          >
            View live results
          </button>
        </div>
      )}

      {liveConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
            <h3 className="text-lg font-bold">View live results?</h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Tallies may change while voting is open. Only proceed if you need operational
              visibility during the election.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setLiveConfirmOpen(false)}
                className="flex-1 rounded-lg border py-2 text-sm dark:border-zinc-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setLiveConfirmOpen(false);
                  loadResults(true);
                }}
                className="flex-1 rounded-lg bg-amber-600 py-2 text-sm font-semibold text-white"
              >
                Show live tallies
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'results' && results && (
        <div className="mt-8">
          <ElectionResultsReport
            electionTitle={results.election.title}
            electionId={results.election.id}
            positions={results.positions}
            analytics={results.analytics}
          />
        </div>
      )}
      {tab === 'results' && !results && !resultsBlocked && (
        <p className="mt-8 text-sm text-zinc-500">No results data yet.</p>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white'
          : 'rounded-lg border px-4 py-2 text-sm dark:border-zinc-700'
      }
    >
      {children}
    </button>
  );
}

function formatRange(start: string, end: string) {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  return `${fmt(start)} → ${fmt(end)}`;
}
