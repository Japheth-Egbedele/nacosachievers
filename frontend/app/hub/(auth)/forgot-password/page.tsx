'use client';

import Link from 'next/link';
import { useState } from 'react';
import HubAlert from '@/app/hub/components/ui/HubAlert';
import HubAuthLayout from '@/app/hub/components/ui/HubAuthLayout';
import HubField, { HubTextInput } from '@/app/hub/components/ui/HubField';
import { hubBtnPrimary } from '@/lib/hub-styles';
import { apiFetch, ApiClientError } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await apiFetch(
        '/auth/forgot-password',
        { method: 'POST', body: JSON.stringify({ email: email.trim() }) },
        false,
      );
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <HubAuthLayout
      title="Reset your password"
      subtitle={
        <>
          Enter the email on your account. We&apos;ll send a reset link if it exists.{' '}
          <Link href="/hub/login" className="font-medium text-emerald-700 hover:underline">
            Back to sign in
          </Link>
        </>
      }
    >
      {sent ? (
        <div className="mt-8 space-y-5">
          <HubAlert variant="success">
            If an account exists for <strong>{email.trim()}</strong>, we&apos;ve sent password reset
            instructions. Check your inbox and spam folder.
          </HubAlert>
          <Link href="/hub/login" className={`${hubBtnPrimary} text-center`}>
            Return to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {error && <HubAlert variant="error">{error}</HubAlert>}
          <HubField label="Email">
            <HubTextInput
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </HubField>
          <button type="submit" disabled={busy} className={hubBtnPrimary}>
            {busy ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}
    </HubAuthLayout>
  );
}
