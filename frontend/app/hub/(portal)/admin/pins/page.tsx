'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import CopyButton from '@/app/components/CopyButton';
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

  const copyAllText = issued
    ? `NACOS Hub onboarding\nMatric: ${issued.matric_number}\nPIN: ${issued.pin}\nRegister: ${typeof window !== 'undefined' ? window.location.origin : ''}/hub/register`
    : '';

  if (loading || !isSuperAdmin) return null;

  return (
    <div>
      <Link href="/hub/dashboard" className="text-sm font-medium text-emerald-600 hover:underline">
        ← Dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-zinc-900 dark:text-white">Issue onboarding PINs</h1>
      <p className="mt-2 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
        Only <strong>super admins</strong> can create PINs. Share matric + PIN once. Students register at{' '}
        <Link href="/hub/register" className="font-medium text-emerald-600 underline">
          /hub/register
        </Link>
        , then verify email before voting.
      </p>

      <form
        onSubmit={handleGenerate}
        className="mt-8 max-w-md space-y-4 rounded-xl border border-emerald-200/80 bg-white p-6 shadow-sm dark:border-emerald-900 dark:bg-zinc-900"
      >
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div>
          <label className="block text-sm font-medium">Matric number</label>
          <input
            required
            value={matric}
            onChange={(e) => setMatric(e.target.value)}
            placeholder="e.g. CS/2023/001"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-800"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Level of entry (optional)</label>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
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
          className="w-full rounded-lg bg-emerald-600 py-2.5 font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
        >
          {busy ? 'Generating…' : 'Generate PIN'}
        </button>
      </form>

      {issued && (
        <div className="mt-8 max-w-md rounded-xl border-2 border-emerald-500 bg-gradient-to-b from-emerald-50 to-white p-6 shadow-md dark:border-emerald-600 dark:from-emerald-950/50 dark:to-zinc-900">
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
            Copy now — PIN is shown only once
          </p>

          <div className="mt-4 rounded-lg border border-emerald-200 bg-white/80 p-4 dark:border-emerald-800 dark:bg-zinc-950/50">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-700/80">Matric</p>
                <p className="font-mono text-lg font-bold text-emerald-900 dark:text-emerald-100">
                  {issued.matric_number}
                </p>
              </div>
              <CopyButton value={issued.matric_number} label="Copy matric" />
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-emerald-200 bg-white/80 p-4 dark:border-emerald-800 dark:bg-zinc-950/50">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-700/80">PIN</p>
                <p className="font-mono text-2xl font-bold tracking-[0.2em] text-emerald-800 dark:text-emerald-100">
                  {issued.pin}
                </p>
              </div>
              <CopyButton value={issued.pin} label="Copy PIN" />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <CopyButton value={copyAllText} label="Copy all details" />
          </div>

          <p className="mt-4 text-xs text-emerald-800/70 dark:text-emerald-300/80">
            Expires in 72 hours if unused.
          </p>
        </div>
      )}
    </div>
  );
}
