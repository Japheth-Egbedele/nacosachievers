'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import HubAuthBrand from '@/app/components/HubAuthBrand';
import PasswordInput from '@/app/components/PasswordInput';
import Spinner, { SpinnerCenter } from '@/app/components/Spinner';
import { apiFetch, ApiClientError } from '@/lib/api';

function VerifyEmailForm() {
  const params = useSearchParams();
  const router = useRouter();
  const tokenFromUrl = params.get('token') ?? '';
  const justRegistered = params.get('registered') === '1';
  const unverified = params.get('unverified') === '1';
  const emailParam = params.get('email') ?? '';

  const [token, setToken] = useState('');
  const [email, setEmail] = useState(emailParam);
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [autoStarted, setAutoStarted] = useState(false);
  const [showRecovery] = useState(true);

  useEffect(() => {
    if (emailParam) setEmail(emailParam);
  }, [emailParam]);

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
    } else if (justRegistered && !message && !tokenFromUrl) {
      setMessage(
        'We sent a verification link to your email. Check your inbox and spam folder — the link expires in 24 hours.',
      );
    } else if (unverified && !message) {
      setMessage('Your account is not verified yet. Resend the link or update your email below.');
    }
  }, [tokenFromUrl, justRegistered, unverified, autoStarted, verifyToken, message]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await verifyToken(token);
  }

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      await apiFetch(
        '/auth/resend-verification',
        { method: 'POST', body: JSON.stringify({ email: email.trim(), password }) },
        false,
      );
      setMessage('Verification email sent. Check your inbox and spam folder.');
      setPassword('');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not resend email');
    } finally {
      setBusy(false);
    }
  }

  async function handleCorrectEmail(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const result = await apiFetch<{ email: string }>(
        '/auth/correct-pending-email',
        {
          method: 'POST',
          body: JSON.stringify({
            email: email.trim(),
            password,
            new_email: newEmail.trim(),
          }),
        },
        false,
      );
      setEmail(result.email);
      setNewEmail('');
      setPassword('');
      setMessage(`Email updated to ${result.email}. Check your inbox for the new verification link.`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not update email');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
      <HubAuthBrand />
      <h1 className="text-2xl font-bold">Verify your email</h1>

      {message && <p className="mt-4 text-sm font-medium text-emerald-700 dark:text-emerald-400">{message}</p>}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {busy && tokenFromUrl ? (
        <div className="mt-6 flex items-center gap-3">
          <Spinner className="h-6 w-6" />
          <p className="text-sm text-zinc-500">Verifying your link…</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Or paste verification token
            </label>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="From email link"
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

      {showRecovery && (
        <div className="mt-8 space-y-6 border-t border-zinc-100 pt-6 dark:border-zinc-800">
          <div>
            <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Didn&apos;t get the email?
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Enter the email and password you registered with, then resend the link.
            </p>
            <form onSubmit={handleResend} className="mt-3 space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Registered email"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              />
              <PasswordInput
                value={password}
                onChange={setPassword}
                required
                placeholder="Your password"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg border border-emerald-600 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 dark:text-emerald-400"
              >
                {busy ? 'Sending…' : 'Resend verification email'}
              </button>
            </form>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Wrong email?</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Update to the correct address before verifying (account must not be verified yet).
            </p>
            <form onSubmit={handleCorrectEmail} className="mt-3 space-y-3">
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Correct email address"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              />
              <button
                type="submit"
                disabled={busy || !newEmail.trim()}
                className="w-full rounded-lg border border-zinc-300 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-300"
              >
                {busy ? 'Updating…' : 'Update email and resend'}
              </button>
            </form>
          </div>
        </div>
      )}

      <Link href="/hub/login" className="mt-6 block text-center text-sm font-medium text-emerald-600 hover:underline">
        Go to sign in
      </Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <Suspense fallback={<SpinnerCenter />}>
        <VerifyEmailForm />
      </Suspense>
    </div>
  );
}
