'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiClientError } from '@/lib/api';

interface Candidate {
  id: string;
  name: string;
  position: string;
  manifesto?: string;
  vote_count: number;
}

interface ElectionDetail {
  election: { id: string; title: string; status: string; start_date: string; end_date: string };
  candidates: Candidate[];
  user_vote: string[] | null;
  total_votes: number;
}

export default function ElectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ElectionDetail | null>(null);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    apiFetch<ElectionDetail>(`/elections/${id}`)
      .then((d) => {
        setData(d);
        if (d.user_vote?.length || d.election.status === 'completed') setShowResults(true);
      })
      .catch(() => setData(null));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!data) {
    return <p className="text-zinc-500">Loading election…</p>;
  }

  const { election, candidates, user_vote } = data;
  const canVote = election.status === 'active' && !user_vote?.length;
  const byPosition = groupByPosition(candidates);

  function toggleSelect(position: string, candidateId: string) {
    setSelected((prev) => ({ ...prev, [position]: candidateId }));
  }

  async function submitVote() {
    const candidateIds = Object.values(selected);
    if (candidateIds.length === 0) {
      setError('Select at least one candidate.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await apiFetch(`/elections/${id}/vote`, {
        method: 'POST',
        body: JSON.stringify({ candidate_ids: candidateIds }),
      });
      load();
      setShowResults(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Vote failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Link href="/hub/elections" className="text-sm text-emerald-600 hover:underline">
        ← All elections
      </Link>
      <h1 className="mt-4 text-2xl font-bold">{election.title}</h1>
      <p className="mt-1 text-sm uppercase font-semibold text-emerald-700">{election.status}</p>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {canVote && !showResults && (
        <div className="mt-8 space-y-8">
          {Object.entries(byPosition).map(([position, list]) => (
            <section key={position}>
              <h2 className="font-semibold text-zinc-800">{position}</h2>
              <ul className="mt-3 space-y-2">
                {list.map((c) => (
                  <li key={c.id}>
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 p-4 has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50 dark:border-zinc-700">
                      <input
                        type="radio"
                        name={position}
                        checked={selected[position] === c.id}
                        onChange={() => toggleSelect(position, c.id)}
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
          <button
            type="button"
            disabled={busy}
            onClick={submitVote}
            className="rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {busy ? 'Submitting…' : 'Submit ballot'}
          </button>
        </div>
      )}

      {(showResults || user_vote?.length || election.status === 'completed') && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold">Results</h2>
          <p className="text-sm text-zinc-500">{data.total_votes} total vote(s) recorded</p>
          <ul className="mt-4 space-y-3">
            {[...candidates]
              .sort((a, b) => b.vote_count - a.vote_count)
              .map((c) => {
                const pct =
                  data.total_votes > 0
                    ? Math.round((c.vote_count / data.total_votes) * 100)
                    : 0;
                return (
                  <li key={c.id} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
                    <div className="flex justify-between text-sm font-medium">
                      <span>
                        {c.name} — {c.position}
                      </span>
                      <span>
                        {c.vote_count} ({pct}%)
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
          </ul>
        </div>
      )}
    </div>
  );
}

function groupByPosition(candidates: Candidate[]): Record<string, Candidate[]> {
  return candidates.reduce<Record<string, Candidate[]>>((acc, c) => {
    if (!acc[c.position]) acc[c.position] = [];
    acc[c.position].push(c);
    return acc;
  }, {});
}
