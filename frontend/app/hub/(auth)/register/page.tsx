'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import PasswordInput from '@/app/components/PasswordInput';
import HubAlert from '@/app/hub/components/ui/HubAlert';
import HubAuthLayout from '@/app/hub/components/ui/HubAuthLayout';
import HubField, { HubTextInput } from '@/app/hub/components/ui/HubField';
import HubPillTabs from '@/app/hub/components/ui/HubPillTabs';
import { hubBtnGhost, hubBtnPrimary } from '@/lib/hub-styles';
import { apiFetch, ApiClientError } from '@/lib/api';
import { pinValidationErrorMessage } from '@/lib/pin-errors';

type RegisterMode = 'student' | 'staff';

type PinPreview = {
  level_of_entry: string | null;
  department_id: string | null;
  year_of_admission: number | null;
  is_staff: boolean;
};

export default function HubRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<'pin' | 'details'>('pin');
  const [mode, setMode] = useState<RegisterMode>('student');
  const [onboardingToken, setOnboardingToken] = useState('');
  const [pinPreview, setPinPreview] = useState<PinPreview | null>(null);
  const [matric, setMatric] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [yearOfAdmission, setYearOfAdmission] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const isStudent = mode === 'student' && !pinPreview?.is_staff;
  const needsYearOfAdmission =
    isStudent && pinPreview != null && pinPreview.year_of_admission == null;

  async function validatePin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const body =
        mode === 'student'
          ? { matric_number: matric.trim(), pin }
          : { staff_email: staffEmail.trim().toLowerCase(), pin };

      const data = await apiFetch<{ onboarding_token: string; pin_preview: PinPreview }>(
        '/auth/validate-pin',
        { method: 'POST', body: JSON.stringify(body) },
        false,
      );
      setOnboardingToken(data.onboarding_token);
      setPinPreview(data.pin_preview);
      setStep('details');
    } catch (err) {
      setError(pinValidationErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function register(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        onboarding_token: onboardingToken,
        email,
        password,
        first_name: firstName,
        last_name: lastName,
      };
      if (needsYearOfAdmission && yearOfAdmission.trim()) {
        payload.year_of_admission = parseInt(yearOfAdmission, 10);
      }

      const result = await apiFetch<{ userId: string; email_sent?: boolean }>(
        '/auth/register',
        {
          method: 'POST',
          body: JSON.stringify(payload),
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

  const levelLabel =
    pinPreview?.level_of_entry && pinPreview.level_of_entry !== 'staff'
      ? `Level ${pinPreview.level_of_entry}`
      : pinPreview?.is_staff
        ? 'Staff'
        : '—';

  return (
    <HubAuthLayout
      title={step === 'pin' ? 'Join The Hub' : 'Your details'}
      subtitle={
        step === 'pin' ? (
          <>
            Step 1 of 2 — verify your chapter PIN.{' '}
            <Link href="/hub/login" className="font-medium text-emerald-700 hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          'Step 2 of 2 — create your account.'
        )
      }
    >
      {step === 'pin' ? (
        <form onSubmit={validatePin} className="mt-8 space-y-5">
          {error && <HubAlert variant="error">{error}</HubAlert>}

          <HubPillTabs
            tabs={[
              { key: 'student', label: 'Student' },
              { key: 'staff', label: 'Staff' },
            ]}
            active={mode}
            onChange={(key) => setMode(key as RegisterMode)}
          />

          {mode === 'student' ? (
            <HubField
              label="Matric number"
              hint="Your university ID (e.g. AU23AY4578)"
            >
              <HubTextInput
                required
                value={matric}
                onChange={(e) => setMatric(e.target.value)}
                placeholder="AU23AY4578"
                autoComplete="off"
              />
            </HubField>
          ) : (
            <HubField
              label="Staff email"
              hint="The institutional email your PIN was issued to"
            >
              <HubTextInput
                type="email"
                required
                value={staffEmail}
                onChange={(e) => setStaffEmail(e.target.value)}
                placeholder="you@achievers.edu.ng"
                autoComplete="email"
              />
            </HubField>
          )}

          <HubField label="Onboarding PIN" hint="8-character code from your admin">
            <HubTextInput
              required
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value.toUpperCase())}
              className="font-mono tracking-widest uppercase"
              autoComplete="off"
            />
          </HubField>
          <button type="submit" disabled={busy} className={hubBtnPrimary}>
            {busy ? 'Checking…' : 'Continue'}
          </button>
        </form>
      ) : (
        <form onSubmit={register} className="mt-8 space-y-5">
          {error && <HubAlert variant="error">{error}</HubAlert>}

          {pinPreview && !pinPreview.is_staff && (
            <HubField label="Level of entry">
              <HubTextInput readOnly value={levelLabel} className="bg-[var(--color-hub-surface-muted)]" />
            </HubField>
          )}

          {needsYearOfAdmission && (
            <HubField label="Year of admission" hint="Required for student registration">
              <HubTextInput
                type="number"
                required
                min={1990}
                max={2100}
                value={yearOfAdmission}
                onChange={(e) => setYearOfAdmission(e.target.value)}
                placeholder="e.g. 2023"
              />
            </HubField>
          )}

          <div className="grid grid-cols-2 gap-3">
            <HubField label="First name">
              <HubTextInput
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </HubField>
            <HubField label="Last name">
              <HubTextInput
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </HubField>
          </div>
          <HubField label="Email">
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
              minLength={8}
              placeholder="At least 8 characters"
              className="rounded-xl border-[#e8e6e1] py-2.5 pl-3.5"
            />
          </HubField>
          <button type="submit" disabled={busy} className={hubBtnPrimary}>
            {busy ? 'Creating account…' : 'Create account'}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('pin');
              setPinPreview(null);
            }}
            className={`${hubBtnGhost} w-full`}
          >
            ← Back to PIN
          </button>
        </form>
      )}
    </HubAuthLayout>
  );
}
