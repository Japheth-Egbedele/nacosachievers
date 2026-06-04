'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch, ApiClientError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function AdminPinsPage() {
  const { isSuperAdmin, loading } = useAuth();
  const router = useRouter();
  const [matric, setMatric] = useState('');
  const [level, setLevel] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<{
    matric_number: string;
    pin: string;
    id: string;
  } | null>(null);

  useEffect(() => {
    if (!loading && !isSuperAdmin) router.replace('/hub/dashboard');
  }, [loading, isSuperAdmin, router]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIssued(null);
    setBusy(true);
    try {
      const data = await apiFetch<{
        id: string;
        pin: string;
        matric_number: string;
      }>('/admin/pins/generate', {
        method: 'POST',
        body: JSON.stringify({
          matric_number: matric.trim().toUpperCase(),
          ...(level ? { level_of_entry: level } : {}),
        }),
      });
      setIssued(data);
      setMatric('');
      setLevel('');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to generate PIN');
    } finally {
      setBusy(false);
    }
  }

  if (loading || !isSuperAdmin) return null;

  return (
    <div>
      <Link href="/hub/dashboard" className="text-sm text-emerald-600 hover:underline">
        ← Dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-bold">Issue onboarding PINs</h1>
      <p className="mt-2 max-w-xl text-sm text-zinc-600">
        Only <strong>super admins</strong> can create PINs. Give each CS student their matric number
        and the 8-character PIN once (shown below). They register at{' '}
        <Link href="/hub/register" className="text-emerald-600 underline">
          /hub/register
        </Link>
        , then verify email before voting or using the Hub.
      </p>

      <form onSubmit={handleGenerate} className="mt-8 max-w-md space-y-4 rounded-xl border p-6">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div>
          <label className="block text-sm font-medium">Matric number</label>
          <input
            required
            value={matric}
            onChange={(e) => setMatric(e.target.value)}
            placeholder="e.g. CS/2023/001"
            className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-zinc-800"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Level of entry (optional)</label>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-zinc-800"
          >
            <option value="">— default —</option>
            <option value="100">100</option>
            <option value="200">200</option>
            <option value="300">300</option>
            <option value="400">400</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {busy ? 'Generating…' : 'Generate PIN'}
        </button>
      </form>

      {issued && (
        <div className="mt-8 max-w-md rounded-xl border-2 border-amber-300 bg-amber-50 p-6 dark:border-amber-700 dark:bg-amber-950/40">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            Copy now — this PIN is shown only once
          </p>
          <p className="mt-3 text-sm text-zinc-600">Matric</p>
          <p className="font-mono text-lg font-bold">{issued.matric_number}</p>
          <p className="mt-3 text-sm text-zinc-600">PIN</p>
          <p className="font-mono text-2xl font-bold tracking-widest text-emerald-800">
            {issued.pin}
          </p>
          <p className="mt-4 text-xs text-zinc-500">Expires in 72 hours if unused.</p>
        </div>
      )}
    </div>
  );
}
