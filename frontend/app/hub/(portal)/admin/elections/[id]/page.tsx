'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch, ApiClientError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface Candidate {
  id: string;
  name: string;
  position: string;
  vote_count: number;
}

export default function AdminElectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin, loading } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [manifesto, setManifesto] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !isAdmin) router.replace('/hub/dashboard');
  }, [loading, isAdmin, router]);

  const loadResults = () => {
    if (!id) return;
    apiFetch<{ election: { title: string }; candidates: Candidate[] }>(
      `/admin/elections/${id}/results`,
    ).then((d) => {
      setTitle(d.election.title);
      setCandidates(d.candidates);
    });
  };

  useEffect(() => {
    if (isAdmin && id) loadResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load on id/admin only
  }, [isAdmin, id]);

  async function addCandidate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await apiFetch(`/admin/elections/${id}/candidates`, {
        method: 'POST',
        body: JSON.stringify({ name, position, manifesto: manifesto || undefined }),
      });
      setName('');
      setPosition('');
      setManifesto('');
      loadResults();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed');
    }
  }

  if (loading || !isAdmin) return null;

  return (
    <div>
      <Link href="/hub/admin/elections" className="text-sm text-emerald-600 hover:underline">
        ← Elections
      </Link>
      <h1 className="mt-4 text-2xl font-bold">{title || 'Election'}</h1>

      <form onSubmit={addCandidate} className="mt-8 max-w-md space-y-3 rounded-xl border p-5">
        <h2 className="font-semibold">Add candidate</h2>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <input
          placeholder="Name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 dark:bg-zinc-800"
        />
        <input
          placeholder="Position (e.g. President)"
          required
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 dark:bg-zinc-800"
        />
        <textarea
          placeholder="Manifesto (optional)"
          value={manifesto}
          onChange={(e) => setManifesto(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 dark:bg-zinc-800"
        />
        <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-white text-sm">
          Add
        </button>
      </form>

      <section className="mt-10">
        <h2 className="font-semibold">Results preview</h2>
        <ul className="mt-4 space-y-2">
          {candidates.map((c) => (
            <li key={c.id} className="flex justify-between rounded-lg border px-4 py-2 text-sm">
              <span>
                {c.name} — {c.position}
              </span>
              <span>{c.vote_count} votes</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
