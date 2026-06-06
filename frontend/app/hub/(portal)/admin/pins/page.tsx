'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import CopyButton from '@/app/components/CopyButton';
import HubAlert from '@/app/hub/components/ui/HubAlert';
import HubField, { HubTextInput } from '@/app/hub/components/ui/HubField';
import HubPageHeader from '@/app/hub/components/ui/HubPageHeader';
import HubPillTabs from '@/app/hub/components/ui/HubPillTabs';
import { hubBtnPrimary } from '@/lib/hub-styles';
import { apiFetch, ApiClientError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type PinMode = 'student' | 'staff';

type IssuedPin = {
  id: string;
  pin: string;
  matric_number: string;
  staff_email?: string;
  level_of_entry?: string;
};

export default function AdminPinsPage() {
  const { isSuperAdmin, canIssuePins, loading } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<PinMode>('student');
  const [matric, setMatric] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [level, setLevel] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<IssuedPin | null>(null);

  const allowed = canIssuePins;

  useEffect(() => {
    if (!loading && !allowed) router.replace('/hub/elections');
  }, [loading, allowed, router]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIssued(null);
    setBusy(true);
    try {
      const body =
        mode === 'staff'
          ? { staff_email: staffEmail.trim().toLowerCase() }
          : {
              matric_number: matric.trim().toUpperCase(),
              ...(level ? { level_of_entry: level } : {}),
            };

      const data = await apiFetch<IssuedPin>('/admin/pins/generate', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setIssued({ ...data, level_of_entry: level || undefined });
      setMatric('');
      setStaffEmail('');
      setLevel('');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to generate PIN');
    } finally {
      setBusy(false);
    }
  }

  const idLabel = issued?.staff_email ?? issued?.matric_number ?? '';
  const copyAllText = issued
    ? `NACOS Hub onboarding\nID: ${idLabel}\nPIN: ${issued.pin}\nRegister: ${typeof window !== 'undefined' ? window.location.origin : ''}/hub/register`
    : '';

  if (loading || !allowed) return null;

  return (
    <div className="mx-auto max-w-2xl">
      <HubPageHeader
        title="Issue onboarding PINs"
        description="Share ID + PIN once. Members register at /hub/register then verify email before voting."
      />

      {error && <HubAlert variant="error" className="mb-6">{error}</HubAlert>}

      <form onSubmit={handleGenerate} className="hub-card space-y-5 p-6">
        {isSuperAdmin ? (
          <HubPillTabs
            tabs={[
              { key: 'student', label: 'Student' },
              { key: 'staff', label: 'Staff' },
            ]}
            active={mode}
            onChange={(key) => setMode(key as PinMode)}
          />
        ) : (
          <p className="text-sm text-[var(--color-hub-text-secondary)]">
            Generate student onboarding PINs for new members.
          </p>
        )}

        {mode === 'staff' && isSuperAdmin ? (
          <HubField label="Staff email" hint="Institutional email for lecturers and department staff">
            <HubTextInput
              type="email"
              required
              value={staffEmail}
              onChange={(e) => setStaffEmail(e.target.value)}
              placeholder="lecturer@achievers.edu.ng"
            />
          </HubField>
        ) : (
          <>
            <HubField label="Matric number" hint="University ID for the new member">
              <HubTextInput
                required
                value={matric}
                onChange={(e) => setMatric(e.target.value)}
                placeholder="AU23AY4578"
              />
            </HubField>
            <HubField label="Level of entry (optional)">
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="hub-input w-full rounded-xl px-3.5 py-2.5 text-sm"
              >
                <option value="">— default —</option>
                <option value="100">100</option>
                <option value="200">200</option>
                <option value="300">300</option>
                <option value="400">400</option>
              </select>
            </HubField>
          </>
        )}

        <button type="submit" disabled={busy} className={hubBtnPrimary}>
          {busy ? 'Generating…' : 'Generate PIN'}
        </button>
      </form>

      {issued && (
        <div className="hub-card mt-8 overflow-hidden border-2 border-[var(--color-brand)]/40 p-0">
          <div className="bg-gradient-to-r from-[#0f172a] to-[#047857] px-6 py-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-200/90">
              One-time credentials
            </p>
            <p className="mt-1 text-sm text-emerald-50/90">Copy now — the PIN is shown only once.</p>
          </div>

          <div className="space-y-4 p-6">
            <div className="hub-card-muted flex items-start justify-between gap-3 p-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-hub-muted)]">
                  {issued.staff_email ? 'Staff email' : 'Matric number'}
                </p>
                <p className="font-mono text-lg font-bold text-[var(--color-hub-text)]">{idLabel}</p>
              </div>
              <CopyButton value={idLabel} label="Copy ID" />
            </div>

            <div className="hub-card-muted flex items-start justify-between gap-3 p-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-hub-muted)]">
                  PIN
                </p>
                <p className="font-mono text-2xl font-bold tracking-[0.2em] text-[var(--color-brand)]">
                  {issued.pin}
                </p>
              </div>
              <CopyButton value={issued.pin} label="Copy PIN" />
            </div>

            <CopyButton value={copyAllText} label="Copy all details" className="w-full" />

            <p className="text-xs text-[var(--color-hub-text-secondary)]">
              Expires in 72 hours if unused.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
