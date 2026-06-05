'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import HubAuthBrand from '@/app/components/HubAuthBrand';
import PasswordInput from '@/app/components/PasswordInput';
import { apiFetch, ApiClientError } from '@/lib/api';

export default function HubRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<'pin' | 'details'>('pin');
  const [onboardingToken, setOnboardingToken] = useState('');
  const [matric, setMatric] = useState('');
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function validatePin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await apiFetch<{ onboarding_token: string }>(
        '/auth/validate-pin',
        {
          method: 'POST',
          body: JSON.stringify({ matric_number: matric.trim(), pin }),
        },
        false,
      );
      setOnboardingToken(data.onboarding_token);
      setStep('details');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Invalid PIN');
    } finally {
      setBusy(false);
    }
  }

  async function register(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await apiFetch<{ userId: string; email_sent?: boolean }>(
        '/auth/register',
        {
          method: 'POST',
          body: JSON.stringify({
            onboarding_token: onboardingToken,
            email,
            password,
            first_name: firstName,
            last_name: lastName,
          }),
        },
        false,
      );
      const qs = new URLSearchParams({ registered: '1' });
      if (result.email_sent === false) qs.set('email_sent', '0');
      if (email.trim()) qs.set('email', email.trim());
      router.push(`/hub/verify-email?${qs.toString()}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Registration failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <HubAuthBrand />
        <h1 className="text-2xl font-bold">Join The Hub</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Already have an account?{' '}
          <Link href="/hub/login" className="text-emerald-600 hover:underline">
            Sign in
          </Link>
        </p>

        {step === 'pin' ? (
          <form onSubmit={validatePin} className="mt-8 space-y-4">
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <div>
              <label className="block text-sm font-medium">Matric number</label>
              <input
                required
                value={matric}
                onChange={(e) => setMatric(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Onboarding PIN (8 characters)</label>
              <input
                required
                maxLength={8}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-700"
            >
              {busy ? 'Checking…' : 'Continue'}
            </button>
          </form>
        ) : (
          <form onSubmit={register} className="mt-8 space-y-4">
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium">First name</label>
                <input
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Last name</label>
                <input
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-zinc-800"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-zinc-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Password</label>
              <div className="mt-1">
                <PasswordInput
                  value={password}
                  onChange={setPassword}
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-emerald-600 py-2.5 font-semibold text-white"
            >
              {busy ? 'Creating account…' : 'Create account'}
            </button>
            <button type="button" onClick={() => setStep('pin')} className="w-full text-sm text-zinc-500">
              ← Back to PIN
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
