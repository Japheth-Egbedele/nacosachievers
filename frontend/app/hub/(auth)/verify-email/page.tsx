'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import PasswordInput from '@/app/components/PasswordInput';
import Spinner, { SpinnerCenter } from '@/app/components/Spinner';
import HubAlert from '@/app/hub/components/ui/HubAlert';
import HubAuthLayout from '@/app/hub/components/ui/HubAuthLayout';
import HubField, { HubTextInput } from '@/app/hub/components/ui/HubField';
import { hubBtnPrimary, hubBtnSecondary } from '@/lib/hub-styles';
import { apiFetch, ApiClientError, setAccessToken } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type RecoveryPanel = 'none' | 'wrongEmail' | 'pasteToken';

function VerifyEmailForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { refreshUser } = useAuth();
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
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);
  const [updatingEmail, setUpdatingEmail] = useState(false);
  const [autoStarted, setAutoStarted] = useState(false);
  const [recoveryPanel, setRecoveryPanel] = useState<RecoveryPanel>('none');

  useEffect(() => {
    if (!emailParam) return;
    const t = window.setTimeout(() => setEmail(emailParam), 0);
    return () => window.clearTimeout(t);
  }, [emailParam]);

  const verifyToken = useCallback(async (value: string) => {
    if (!value.trim()) return;
    setError('');
    setVerifying(true);
    try {
      const data = await apiFetch<{ access_token: string }>(
        '/auth/verify-email',
        { method: 'POST', body: JSON.stringify({ token: value.trim() }) },
        false,
      );
      setAccessToken(data.access_token);
      await refreshUser();
      setMessage('You’re in! Opening elections…');
      router.replace('/hub/elections');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Verification failed');
    } finally {
      setVerifying(false);
    }
  }, [router, refreshUser]);

  useEffect(() => {
    if (tokenFromUrl && !autoStarted) {
      const t = window.setTimeout(() => {
        setAutoStarted(true);
        setToken(tokenFromUrl);
        void verifyToken(tokenFromUrl);
      }, 0);
      return () => window.clearTimeout(t);
    } else if (justRegistered && !message && !tokenFromUrl) {
      const t = window.setTimeout(
        () =>
          setMessage(
            'We sent a verification link to your email. Check your inbox and spam folder — the link expires in 24 hours.',
          ),
        0,
      );
      return () => window.clearTimeout(t);
    } else if (unverified && !message) {
      const t = window.setTimeout(() => setMessage('Your account is not verified yet. Resend the link below.'), 0);
      return () => window.clearTimeout(t);
    }
  }, [tokenFromUrl, justRegistered, unverified, autoStarted, verifyToken, message]);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setSending(true);
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
      setSending(false);
    }
  }

  async function handleCorrectEmail(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setUpdatingEmail(true);
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
      setRecoveryPanel('none');
      setMessage(`Email updated to ${result.email}. Check your inbox for the new link.`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not update email');
    } finally {
      setUpdatingEmail(false);
    }
  }

  const busy = verifying || sending || updatingEmail;

  return (
    <HubAuthLayout title="Verify your email">
      <div className="mt-6 space-y-5">
        {message && <HubAlert variant="success">{message}</HubAlert>}
        {error && <HubAlert variant="error">{error}</HubAlert>}

        {verifying && tokenFromUrl ? (
          <div className="flex items-center gap-3 rounded-xl bg-[#f5f4f0] px-4 py-4">
            <Spinner className="h-6 w-6" />
            <p className="text-sm text-zinc-600">Verifying your link…</p>
          </div>
        ) : (
          <>
            <form onSubmit={handleResend} className="space-y-4">
              <p className="text-sm text-zinc-600">
                Enter the email and password you registered with, then resend the link.
              </p>
              <HubField label="Registered email">
                <HubTextInput
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </HubField>
              <HubField label="Password">
                <PasswordInput
                  value={password}
                  onChange={setPassword}
                  required
                  placeholder="Your password"
                  className="rounded-xl border-[#e8e6e1] py-2.5 pl-3.5"
                />
              </HubField>
              <button type="submit" disabled={busy} className={hubBtnPrimary}>
                {sending ? 'Sending…' : 'Resend verification email'}
              </button>
            </form>

            <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-[#e8e6e1] pt-4 text-sm">
              <button
                type="button"
                onClick={() =>
                  setRecoveryPanel((p) => (p === 'wrongEmail' ? 'none' : 'wrongEmail'))
                }
                className="font-medium text-emerald-700 hover:underline"
              >
                Wrong email address?
              </button>
              <button
                type="button"
                onClick={() =>
                  setRecoveryPanel((p) => (p === 'pasteToken' ? 'none' : 'pasteToken'))
                }
                className="font-medium text-zinc-600 hover:text-emerald-700 hover:underline"
              >
                Paste token instead
              </button>
              <Link href="/hub/login" className="font-medium text-zinc-600 hover:text-emerald-700">
                Already verified? Sign in
              </Link>
            </div>

            {recoveryPanel === 'wrongEmail' && (
              <form onSubmit={handleCorrectEmail} className="space-y-4 rounded-xl bg-[#f5f4f0] p-4">
                <p className="text-xs text-zinc-600">
                  Update to the correct address before verifying.
                </p>
                <HubField label="Correct email">
                  <HubTextInput
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </HubField>
                <button type="submit" disabled={busy || !newEmail.trim()} className={hubBtnSecondary}>
                  {updatingEmail ? 'Updating…' : 'Update email and resend'}
                </button>
              </form>
            )}

            {recoveryPanel === 'pasteToken' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void verifyToken(token);
                }}
                className="space-y-4 rounded-xl bg-[#f5f4f0] p-4"
              >
                <HubField label="Verification token">
                  <HubTextInput
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="From email link"
                    className="font-mono text-xs"
                  />
                </HubField>
                <button type="submit" disabled={verifying || !token.trim()} className={hubBtnSecondary}>
                  {verifying ? 'Verifying…' : 'Verify token'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </HubAuthLayout>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="hub-auth-bg flex min-h-screen items-center justify-center">
          <SpinnerCenter />
        </div>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}
