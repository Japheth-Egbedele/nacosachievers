'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import PasswordInput from '@/app/components/PasswordInput';
import HubAlert from '@/app/hub/components/ui/HubAlert';
import HubAuthLayout from '@/app/hub/components/ui/HubAuthLayout';
import HubField, { HubTextInput } from '@/app/hub/components/ui/HubField';
import { hubBtnPrimary } from '@/lib/hub-styles';
import { useAuth } from '@/lib/auth-context';
import { ApiClientError } from '@/lib/api';

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const verified = params.get('verified') === '1';
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
      router.push('/hub/elections');
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
    <HubAuthLayout
      title="Welcome back"
      subtitle={
        <>
          New here?{' '}
          <Link href="/hub/register" className="font-medium text-emerald-700 hover:underline">
            Register with your PIN
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {verified && (
          <HubAlert variant="success">
            Email verified! Sign in with your password to enter elections.
          </HubAlert>
        )}
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
        <HubField
          label="Password"
          hint={
            <Link href="/hub/forgot-password" className="hub-link text-xs">
              Forgot password?
            </Link>
          }
        >
          <PasswordInput
            value={password}
            onChange={setPassword}
            required
            className="rounded-xl border-[#e8e6e1] py-2.5 pl-3.5 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
        </HubField>
        <button type="submit" disabled={busy} className={hubBtnPrimary}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </HubAuthLayout>
  );
}

export default function HubLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
