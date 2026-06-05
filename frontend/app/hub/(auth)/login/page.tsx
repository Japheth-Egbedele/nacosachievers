'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import HubAuthBrand from '@/app/components/HubAuthBrand';
import PasswordInput from '@/app/components/PasswordInput';
import { useAuth } from '@/lib/auth-context';
import { ApiClientError } from '@/lib/api';

export default function HubLoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      router.push('/hub/dashboard');
    } catch (err) {
      if (err instanceof ApiClientError && err.code === 'EMAIL_NOT_VERIFIED') {
        router.push(
          `/hub/verify-email?unverified=1&email=${encodeURIComponent(email.trim())}`,
        );
        return;
      }
      setError(err instanceof ApiClientError ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <HubAuthBrand />
        <h1 className="text-2xl font-bold">Sign in to The Hub</h1>
        <p className="mt-2 text-sm text-zinc-500">
          New here?{' '}
          <Link href="/hub/register" className="font-medium text-emerald-600 hover:underline">
            Register with your PIN
          </Link>
        </p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
          <div>
            <label className="block text-sm font-medium text-zinc-700">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Password</label>
            <div className="mt-1">
              <PasswordInput value={password} onChange={setPassword} required />
            </div>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <Link href="/" className="mt-6 block text-center text-sm text-zinc-500 hover:underline">
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
