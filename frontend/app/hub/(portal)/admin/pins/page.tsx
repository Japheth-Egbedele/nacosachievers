'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import CopyButton from '@/app/components/CopyButton';
import HubAlert from '@/app/hub/components/ui/HubAlert';
import HubField, { HubTextInput } from '@/app/hub/components/ui/HubField';
import HubModal from '@/app/hub/components/ui/HubModal';
import HubPageHeader from '@/app/hub/components/ui/HubPageHeader';
import HubPillTabs from '@/app/hub/components/ui/HubPillTabs';
import { hubBtnPrimary, hubBtnSecondary } from '@/lib/hub-styles';
import { apiFetch, ApiClientError } from '@/lib/api';
import { getDepartments, type Department } from '@/lib/departments';
import {
  emptyPinRow,
  parsePastedMatrics,
  pinCredentialBlock,
  pinCredentialBlocksAll,
  type IssuedPinResult,
  type PinRowForm,
} from '@/lib/pin-helpers';
import { useAuth } from '@/lib/auth-context';

type PinMode = 'student' | 'staff';
type ModalStep = 'form' | 'results';

const MAX_ROWS = 10;

export default function AdminPinsPage() {
  const { isSuperAdmin, canIssuePins, loading } = useAuth();
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<ModalStep>('form');
  const [mode, setMode] = useState<PinMode>('student');
  const [rows, setRows] = useState<PinRowForm[]>([emptyPinRow()]);
  const [pasteText, setPasteText] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffDepartmentId, setStaffDepartmentId] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<IssuedPinResult[]>([]);
  const [staffIssued, setStaffIssued] = useState<IssuedPinResult | null>(null);

  const allowed = canIssuePins;

  useEffect(() => {
    if (!loading && !allowed) router.replace('/hub/elections');
  }, [loading, allowed, router]);

  useEffect(() => {
    void getDepartments().then(setDepartments).catch(() => setDepartments([]));
  }, []);

  function resetStudentForm() {
    setRows([emptyPinRow()]);
    setPasteText('');
    setStep('form');
    setIssued([]);
    setError('');
  }

  function openModal() {
    resetStudentForm();
    setStaffEmail('');
    setStaffDepartmentId('');
    setStaffIssued(null);
    setMode('student');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    resetStudentForm();
    setStaffIssued(null);
  }

  function updateRow(id: string, patch: Partial<PinRowForm>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addRow() {
    if (rows.length >= MAX_ROWS) return;
    setRows((prev) => [...prev, emptyPinRow()]);
  }

  function removeRow(id: string) {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)));
  }

  function applyPasteMatrics() {
    const matrics = parsePastedMatrics(pasteText, MAX_ROWS);
    if (matrics.length === 0) return;
    setRows((prev) => {
      const next: PinRowForm[] = matrics.map((matric, i) => {
        const existing = prev[i];
        return existing
          ? { ...existing, matric }
          : { ...emptyPinRow(), matric };
      });
      while (next.length < matrics.length && next.length < MAX_ROWS) {
        next.push(emptyPinRow());
      }
      return next.slice(0, MAX_ROWS);
    });
  }

  function applyRowOneToAll() {
    const first = rows[0];
    if (!first) return;
    setRows((prev) =>
      prev.map((r, i) =>
        i === 0
          ? r
          : {
              ...r,
              departmentId: first.departmentId,
              level: first.level,
              yearOfAdmission: first.yearOfAdmission,
            },
      ),
    );
  }

  async function handleGenerateStudents(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const pins = rows.map((r) => ({
        matric_number: r.matric.trim().toUpperCase(),
        department_id: r.departmentId,
        level_of_entry: r.level as '100' | '200' | '300' | '400',
        ...(r.yearOfAdmission.trim()
          ? { year_of_admission: parseInt(r.yearOfAdmission, 10) }
          : {}),
      }));

      const data = await apiFetch<{ items: IssuedPinResult[] }>('/admin/pins/generate-bulk', {
        method: 'POST',
        body: JSON.stringify({ pins }),
      });
      setIssued(data.items);
      setStep('results');
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        setError(`${err.message} If this keeps happening, use the same browser you logged in with.`);
      } else {
        setError(err instanceof ApiClientError ? err.message : 'Failed to generate PINs');
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerateStaff(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await apiFetch<IssuedPinResult & { staff_email?: string }>(
        '/admin/pins/generate',
        {
          method: 'POST',
          body: JSON.stringify({
            staff_email: staffEmail.trim().toLowerCase(),
            ...(staffDepartmentId ? { department_id: staffDepartmentId } : {}),
          }),
        },
      );
      setStaffIssued({
        id: data.id,
        pin: data.pin,
        matric_number: data.staff_email ?? data.matric_number,
      });
      setStep('results');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to generate PIN');
    } finally {
      setBusy(false);
    }
  }

  if (loading || !allowed) return null;

  return (
    <div className="mx-auto max-w-2xl">
      <HubPageHeader
        title="Issue onboarding PINs"
        description="Generate up to 10 student PINs at once, or a single staff PIN (super admin). Share credentials once — they are shown only once."
      />

      <div className="hub-card p-6">
        <p className="text-sm text-[var(--color-hub-text-secondary)]">
          Use the batch issuer for NACOS reps onboarding many students. Each row can have its own
          matric, department, level, and optional admission year.
        </p>
        <button type="button" onClick={openModal} className={`${hubBtnPrimary} mt-4 w-auto px-6`}>
          Issue PIN(s)
        </button>
      </div>

      <HubModal
        open={modalOpen}
        onClose={closeModal}
        title={step === 'results' ? 'PIN credentials' : 'Issue onboarding PIN(s)'}
        description={
          step === 'results'
            ? 'Copy each row or copy all. PINs expire in 72 hours if unused.'
            : mode === 'staff'
              ? 'Staff work email + optional department.'
              : `Add up to ${MAX_ROWS} students. Paste matrics to fill rows quickly.`
        }
        size="lg"
      >
        {error && (
          <HubAlert variant="error" className="mb-4">
            {error}
          </HubAlert>
        )}

        {step === 'form' && (
          <>
            {isSuperAdmin && (
              <div className="mb-5">
                <HubPillTabs
                  tabs={[
                    { key: 'student', label: 'Students (bulk)' },
                    { key: 'staff', label: 'Staff (single)' },
                  ]}
                  active={mode}
                  onChange={(key) => {
                    setMode(key as PinMode);
                    setError('');
                    setStep('form');
                  }}
                />
              </div>
            )}

            {mode === 'staff' && isSuperAdmin ? (
              <form onSubmit={handleGenerateStaff} className="space-y-4">
                <HubField label="Staff email">
                  <HubTextInput
                    type="email"
                    required
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    placeholder="lecturer@achievers.edu.ng"
                  />
                </HubField>
                <HubField label="Department (optional)">
                  <select
                    value={staffDepartmentId}
                    onChange={(e) => setStaffDepartmentId(e.target.value)}
                    className="hub-input w-full rounded-xl px-3.5 py-2.5 text-sm"
                  >
                    <option value="">— None —</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </HubField>
                <button type="submit" disabled={busy} className={hubBtnPrimary}>
                  {busy ? 'Generating…' : 'Generate staff PIN'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleGenerateStudents} className="space-y-5">
                <HubField
                  label="Paste matrics (optional)"
                  hint="One per line or comma-separated — fills up to 10 rows"
                >
                  <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    rows={3}
                    className="hub-input w-full rounded-xl px-3.5 py-2.5 text-sm"
                    placeholder="AU23AY4578&#10;AU24AC7627"
                  />
                  <button
                    type="button"
                    onClick={applyPasteMatrics}
                    className={`${hubBtnSecondary} mt-2`}
                  >
                    Apply to rows
                  </button>
                </HubField>

                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={addRow} disabled={rows.length >= MAX_ROWS} className={hubBtnSecondary}>
                    + Add row ({rows.length}/{MAX_ROWS})
                  </button>
                  <button type="button" onClick={applyRowOneToAll} className={hubBtnSecondary}>
                    Apply row 1 to all
                  </button>
                </div>

                <div className="space-y-4">
                  {rows.map((row, index) => (
                    <div
                      key={row.id}
                      className="rounded-xl border border-[var(--color-hub-border)] bg-[var(--color-hub-surface-muted)] p-4"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Student {index + 1}
                        </span>
                        {rows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRow(row.id)}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <HubField label="Matric">
                          <HubTextInput
                            required
                            value={row.matric}
                            onChange={(e) => updateRow(row.id, { matric: e.target.value })}
                            placeholder="AU23AY4578"
                          />
                        </HubField>
                        <HubField label="Department">
                          <select
                            required
                            value={row.departmentId}
                            onChange={(e) => updateRow(row.id, { departmentId: e.target.value })}
                            className="hub-input w-full rounded-xl px-3.5 py-2.5 text-sm"
                          >
                            <option value="">— Select —</option>
                            {departments.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                        </HubField>
                        <HubField label="Level">
                          <select
                            required
                            value={row.level}
                            onChange={(e) => updateRow(row.id, { level: e.target.value })}
                            className="hub-input w-full rounded-xl px-3.5 py-2.5 text-sm"
                          >
                            <option value="">— Select —</option>
                            <option value="100">100</option>
                            <option value="200">200</option>
                            <option value="300">300</option>
                            <option value="400">400</option>
                          </select>
                        </HubField>
                        <HubField label="Admission year (optional)">
                          <HubTextInput
                            type="number"
                            min={1990}
                            max={2100}
                            value={row.yearOfAdmission}
                            onChange={(e) => updateRow(row.id, { yearOfAdmission: e.target.value })}
                            placeholder="e.g. 2023"
                          />
                        </HubField>
                      </div>
                    </div>
                  ))}
                </div>

                <button type="submit" disabled={busy} className={hubBtnPrimary}>
                  {busy
                    ? 'Generating…'
                    : `Generate ${rows.length} PIN${rows.length === 1 ? '' : 's'}`}
                </button>
              </form>
            )}
          </>
        )}

        {step === 'results' && (
          <div className="space-y-4">
            {(staffIssued ? [staffIssued] : issued).map((item) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-xl border-2 border-[var(--color-brand)]/40"
              >
                <div className="bg-gradient-to-r from-[#0f172a] to-[#047857] px-4 py-3 text-white">
                  <p className="font-mono text-sm font-bold">{item.matric_number}</p>
                  <p className="mt-1 font-mono text-2xl tracking-[0.2em] text-emerald-200">
                    {item.pin}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 p-3">
                  <CopyButton value={item.pin} label="Copy PIN" />
                  <CopyButton
                    value={pinCredentialBlock(item)}
                    label="Copy row details"
                  />
                </div>
              </div>
            ))}

            {issued.length > 1 && (
              <CopyButton
                value={pinCredentialBlocksAll(issued)}
                label="Copy all details"
                className="w-full"
              />
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  resetStudentForm();
                  setStaffIssued(null);
                }}
                className={hubBtnPrimary}
              >
                Issue more
              </button>
              <button type="button" onClick={closeModal} className={hubBtnSecondary}>
                Done
              </button>
            </div>
          </div>
        )}
      </HubModal>
    </div>
  );
}
