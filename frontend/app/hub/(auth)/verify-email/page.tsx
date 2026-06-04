'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { apiFetch, ApiClientError } from '@/lib/api';

function VerifyEmailForm() {
  const params = useSearchParams();
  const justRegistered = params.get('registered') === '1';
  const [token, setToken] = useState('');
  const [message, setMessage] = useState(justRegistered ? 'Check your email for a verification link, or paste the token below.' : '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await apiFetch('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token }),
      }, false);
      setMessage('Email verified! You can sign in now.');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Verification failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
      <h1 className="text-2xl font-bold">Verify your email</h1>
      {message && <p className="mt-4 text-sm text-emerald-700">{message}</p>}
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <input
          placeholder="Verification token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 dark:bg-zinc-800"
        />
        <button type="submit" disabled={busy} className="w-full rounded-lg bg-emerald-600 py-2 text-white">
          Verify
        </button>
      </form>
      <Link href="/hub/login" className="mt-6 block text-center text-sm text-emerald-600">
        Go to sign in
      </Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Suspense>
        <VerifyEmailForm />
      </Suspense>
    </div>
  );
}
