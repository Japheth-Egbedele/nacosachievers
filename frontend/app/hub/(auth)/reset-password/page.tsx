'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import PasswordInput from '@/app/components/PasswordInput';
import HubAlert from '@/app/hub/components/ui/HubAlert';
import HubAuthLayout from '@/app/hub/components/ui/HubAuthLayout';
import HubField from '@/app/hub/components/ui/HubField';
import { hubBtnPrimary } from '@/lib/hub-styles';
import { apiFetch, ApiClientError } from '@/lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (!token) {
      setError('Reset link is invalid or missing. Request a new one.');
      return;
    }
    setBusy(true);
    try {
      await apiFetch(
        '/auth/reset-password',
        { method: 'POST', body: JSON.stringify({ token, password }) },
        false,
      );
      setDone(true);
      setTimeout(() => router.push('/hub/login'), 2500);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Reset failed');
    } finally {
      setBusy(false);
    }
  }

  if (!token && !done) {
    return (
      <HubAuthLayout
        title="Invalid reset link"
        subtitle={
          <Link href="/hub/forgot-password" className="font-medium text-emerald-700 hover:underline">
            Request a new password reset
          </Link>
        }
      >
        <HubAlert variant="error" className="mt-8">
          This link is missing a token. Open the link from your email or request a new reset.
        </HubAlert>
      </HubAuthLayout>
    );
  }

  return (
    <HubAuthLayout
      title="Choose a new password"
      subtitle="Use at least 8 characters. You'll sign in with this password next."
    >
      {done ? (
        <div className="mt-8 space-y-5">
          <HubAlert variant="success">
            Password updated! Redirecting you to sign in…
          </HubAlert>
          <Link href="/hub/login" className={`${hubBtnPrimary} text-center`}>
            Sign in now
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {error && <HubAlert variant="error">{error}</HubAlert>}
          <HubField label="New password">
            <PasswordInput
              value={password}
              onChange={setPassword}
              required
              minLength={8}
              className="rounded-xl border-[#e8e6e1] py-2.5 pl-3.5 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </HubField>
          <HubField label="Confirm password">
            <PasswordInput
              value={confirm}
              onChange={setConfirm}
              required
              minLength={8}
              className="rounded-xl border-[#e8e6e1] py-2.5 pl-3.5 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </HubField>
          <button type="submit" disabled={busy} className={hubBtnPrimary}>
            {busy ? 'Updating…' : 'Update password'}
          </button>
        </form>
      )}
    </HubAuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
