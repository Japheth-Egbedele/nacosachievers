'use client';

import { useState } from 'react';
import HubAlert from '@/app/hub/components/ui/HubAlert';
import HubDrawer from '@/app/hub/components/ui/HubDrawer';
import HubField, { HubTextInput } from '@/app/hub/components/ui/HubField';
import { hubBtnPrimary, hubBtnSecondary } from '@/lib/hub-styles';
import { ADMIN_SCOPES, type AdminScope } from '@/lib/executive-offices';

export type MemberDetail = {
  id: string;
  matric_number: string;
  email: string;
  role: string;
  level?: string | null;
  year_of_admission?: number | null;
  expected_graduation_year?: number | null;
  actual_graduation_year?: number | null;
  academic_status: string;
  is_active: boolean;
  is_email_verified?: boolean;
  admin_scopes?: AdminScope[];
  first_name: string;
  last_name: string;
};

type MemberDetailDrawerProps = {
  member: MemberDetail | null;
  open: boolean;
  busy?: boolean;
  isSuperAdmin: boolean;
  onClose: () => void;
  onSave: (patch: Record<string, unknown>) => void;
  onCorrectEmail?: (newEmail: string) => Promise<void>;
  onResendVerification?: () => Promise<void>;
};

export default function MemberDetailDrawer({
  member,
  open,
  busy,
  isSuperAdmin,
  onClose,
  onSave,
  onCorrectEmail,
  onResendVerification,
}: MemberDetailDrawerProps) {
  const [newEmail, setNewEmail] = useState('');
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [recoveryError, setRecoveryError] = useState('');

  if (!member) return null;

  const showVerificationRecovery =
    !member.is_email_verified && member.is_active && (onCorrectEmail || onResendVerification);

  async function handleCorrectEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!onCorrectEmail || !newEmail.trim()) return;
    setRecoveryError('');
    setRecoveryMessage('');
    setRecoveryBusy(true);
    try {
      await onCorrectEmail(newEmail.trim());
      setNewEmail('');
      setRecoveryMessage('Email updated. A new verification link was sent.');
    } catch (err) {
      setRecoveryError(err instanceof Error ? err.message : 'Could not update email');
    } finally {
      setRecoveryBusy(false);
    }
  }

  async function handleResend() {
    if (!onResendVerification) return;
    setRecoveryError('');
    setRecoveryMessage('');
    setRecoveryBusy(true);
    try {
      await onResendVerification();
      setRecoveryMessage('Verification email resent.');
    } catch (err) {
      setRecoveryError(err instanceof Error ? err.message : 'Could not resend email');
    } finally {
      setRecoveryBusy(false);
    }
  }

  return (
    <HubDrawer open={open} onClose={onClose} title="Member details">
      <div className="space-y-4 p-4">
        <div>
          <p className="text-lg font-semibold">
            {member.first_name} {member.last_name}
          </p>
          <p className="font-mono text-xs text-zinc-500">{member.matric_number}</p>
          <p className="text-sm text-zinc-600">{member.email}</p>
          <p className="mt-2 text-xs text-zinc-500">
            Email verified:{' '}
            <span className={member.is_email_verified ? 'text-emerald-700' : 'text-amber-700'}>
              {member.is_email_verified ? 'Yes' : 'No — pending verification'}
            </span>
          </p>
        </div>

        {showVerificationRecovery && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900 dark:bg-amber-950/20">
            <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
              Wrong email at registration?
            </h3>
            <p className="mt-1 text-xs text-amber-900/80 dark:text-amber-200/80">
              Update to the correct address and send a fresh verification link. The member must use
              the new inbox to verify.
            </p>
            {recoveryMessage && (
              <HubAlert variant="success" className="mt-3 text-xs">
                {recoveryMessage}
              </HubAlert>
            )}
            {recoveryError && (
              <HubAlert variant="error" className="mt-3 text-xs">
                {recoveryError}
              </HubAlert>
            )}
            <form onSubmit={handleCorrectEmail} className="mt-3 space-y-3">
              <HubField label="Correct email">
                <HubTextInput
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="member@example.com"
                />
              </HubField>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={recoveryBusy || busy || !newEmail.trim()}
                  className={`${hubBtnPrimary} w-auto px-4 py-2 text-xs`}
                >
                  {recoveryBusy ? 'Sending…' : 'Update & resend link'}
                </button>
                {onResendVerification && (
                  <button
                    type="button"
                    disabled={recoveryBusy || busy}
                    onClick={() => void handleResend()}
                    className={`${hubBtnSecondary} w-auto px-4 py-2 text-xs`}
                  >
                    Resend to current email
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {isSuperAdmin ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const role = (form.elements.namedItem('role') as HTMLSelectElement).value;
              const academic_status = (form.elements.namedItem('academic_status') as HTMLSelectElement)
                .value;
              const year_of_admission = (
                form.elements.namedItem('year_of_admission') as HTMLInputElement
              ).value;
              const expected_graduation_year = (
                form.elements.namedItem('expected_graduation_year') as HTMLInputElement
              ).value;
              const scopes = ADMIN_SCOPES.filter(
                (scope) =>
                  (form.elements.namedItem(`scope-${scope}`) as HTMLInputElement)?.checked,
              );
              onSave({
                role,
                academic_status,
                ...(year_of_admission
                  ? { year_of_admission: parseInt(year_of_admission, 10) }
                  : {}),
                ...(expected_graduation_year
                  ? { expected_graduation_year: parseInt(expected_graduation_year, 10) }
                  : {}),
                ...(member.role === 'executive' ? { admin_scopes: scopes } : {}),
              });
            }}
          >
            <HubField label="Role">
              <select
                name="role"
                defaultValue={member.role}
                className="hub-input w-full rounded-xl px-3.5 py-2.5 text-sm"
              >
                <option value="member">Member</option>
                <option value="alumni">Alumni</option>
                <option value="executive">Executive</option>
                <option value="staff">Staff</option>
                <option value="super_admin">Super admin</option>
              </select>
            </HubField>
            <HubField label="Academic status">
              <select
                name="academic_status"
                defaultValue={member.academic_status}
                className="hub-input w-full rounded-xl px-3.5 py-2.5 text-sm"
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="graduated">Graduated</option>
              </select>
            </HubField>
            <HubField label="Year of admission">
              <HubTextInput
                name="year_of_admission"
                type="number"
                defaultValue={member.year_of_admission ?? ''}
                placeholder="e.g. 2023"
              />
            </HubField>
            <HubField label="Expected graduation year">
              <HubTextInput
                name="expected_graduation_year"
                type="number"
                defaultValue={member.expected_graduation_year ?? ''}
                placeholder="e.g. 2027"
              />
            </HubField>
            {member.role === 'executive' && (
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Admin scopes</legend>
                {ADMIN_SCOPES.map((scope) => (
                  <label key={scope} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name={`scope-${scope}`}
                      defaultChecked={member.admin_scopes?.includes(scope)}
                      className="rounded border-zinc-300"
                    />
                    {scope}
                  </label>
                ))}
              </fieldset>
            )}
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className={`${hubBtnSecondary} flex-1`}>
                Cancel
              </button>
              <button type="submit" disabled={busy} className={`${hubBtnPrimary} flex-1`}>
                {busy ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-zinc-600">
            Level: {member.level ? `L${member.level}` : 'Unassigned'} · Status:{' '}
            {member.academic_status}
          </p>
        )}
      </div>
    </HubDrawer>
  );
}
