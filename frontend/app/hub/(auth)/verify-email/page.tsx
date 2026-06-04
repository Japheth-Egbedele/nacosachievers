'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import HubAuthBrand from '@/app/components/HubAuthBrand';
import { apiFetch, ApiClientError } from '@/lib/api';

function VerifyEmailForm() {
  const params = useSearchParams();
  const router = useRouter();
  const tokenFromUrl = params.get('token') ?? '';
  const justRegistered = params.get('registered') === '1';

  const [token, setToken] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [autoStarted, setAutoStarted] = useState(false);

  const verifyToken = useCallback(async (value: string) => {
    if (!value.trim()) return;
    setError('');
    setBusy(true);
    try {
      await apiFetch(
        '/auth/verify-email',
        { method: 'POST', body: JSON.stringify({ token: value.trim() }) },
        false,
      );
      setMessage('Email verified! Redirecting to sign in…');
      setTimeout(() => router.push('/hub/login'), 1500);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Verification failed');
    } finally {
      setBusy(false);
    }
  }, [router]);

  useEffect(() => {
    if (tokenFromUrl && !autoStarted) {
      setAutoStarted(true);
      setToken(tokenFromUrl);
      void verifyToken(tokenFromUrl);
    } else if (justRegistered && !message) {
      setMessage(
        'We sent a verification link to your email. Click the link in that message to activate your account.',
      );
    }
  }, [tokenFromUrl, justRegistered, autoStarted, verifyToken, message]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await verifyToken(token);
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
      <HubAuthBrand />
      <h1 className="text-2xl font-bold">Verify your email</h1>

      {justRegistered && !tokenFromUrl && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">
          <p>
            If you do not receive mail within a few minutes, your chapter may still be on Resend&apos;s
            test sender — only verified domains can email all students. Admins can verify you manually
            in Supabase (<code className="text-xs">is_email_verified = true</code>) until the domain is
            set up.
          </p>
        </div>
      )}

      {message && <p className="mt-4 text-sm font-medium text-emerald-700 dark:text-emerald-400">{message}</p>}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {busy && tokenFromUrl ? (
        <p className="mt-6 text-sm text-zinc-500">Verifying your link…</p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Or paste verification token
            </label>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="From email link or support"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm dark:border-zinc-600 dark:bg-zinc-800"
            />
          </div>
          <button
            type="submit"
            disabled={busy || !token.trim()}
            className="w-full rounded-lg bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {busy ? 'Verifying…' : 'Verify'}
          </button>
        </form>
      )}

      <Link href="/hub/login" className="mt-6 block text-center text-sm font-medium text-emerald-600 hover:underline">
        Go to sign in
      </Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
        <VerifyEmailForm />
      </Suspense>
    </div>
  );
}
