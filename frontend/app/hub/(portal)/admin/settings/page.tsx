'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import HubField, { HubTextInput } from '@/app/hub/components/ui/HubField';
import { hubBtnPrimary, hubBtnSecondary } from '@/lib/hub-styles';
import { apiFetch, ApiClientError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const DEFAULT_PIN_EXPIRY_DAYS = 14;
const MIN_PIN_DAYS = 1;
const MAX_PIN_DAYS = 30;

export default function AdminSettingsPage() {
  const { isSuperAdmin, loading } = useAuth();
  const router = useRouter();
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [jsonText, setJsonText] = useState('');
  const [pinExpiryDays, setPinExpiryDays] = useState(String(DEFAULT_PIN_EXPIRY_DAYS));
  const [pinSaved, setPinSaved] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [promotePreview, setPromotePreview] = useState<{ promote: unknown[]; skip: unknown[] } | null>(
    null,
  );
  const [graduatePreview, setGraduatePreview] = useState<{
    year: number;
    graduate: unknown[];
    skip: unknown[];
  } | null>(null);
  const [sessionMsg, setSessionMsg] = useState('');

  function confirmSessionAction(label: 'PROMOTE' | 'GRADUATE', onConfirm: () => void) {
    const typed = window.prompt(`Type ${label} to confirm this bulk session action:`);
    if (typed?.trim().toUpperCase() !== label) return;
    onConfirm();
  }

  useEffect(() => {
    if (!loading && !isSuperAdmin) router.replace('/hub/admin');
  }, [loading, isSuperAdmin, router]);

  useEffect(() => {
    if (isSuperAdmin) {
      apiFetch<Record<string, unknown>>('/admin/settings')
        .then((s) => {
          setSettings(s);
          setJsonText(JSON.stringify(s, null, 2));
          const hours = Number(s.pin_expiry_hours);
          if (Number.isFinite(hours) && hours > 0) {
            setPinExpiryDays(String(Math.round(hours / 24)));
          }
        })
        .catch(() => setSettings({}));
    }
  }, [isSuperAdmin]);

  async function savePinExpiry(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setPinSaved(false);
    const days = parseInt(pinExpiryDays, 10);
    if (!Number.isFinite(days) || days < MIN_PIN_DAYS || days > MAX_PIN_DAYS) {
      setError(`PIN validity must be between ${MIN_PIN_DAYS} and ${MAX_PIN_DAYS} days.`);
      return;
    }
    try {
      const hours = days * 24;
      const updated = await apiFetch<Record<string, unknown>>('/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify({ pin_expiry_hours: hours }),
      });
      setSettings(updated);
      setJsonText(JSON.stringify(updated, null, 2));
      setPinSaved(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not save PIN setting');
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaved(false);
    try {
      const parsed = JSON.parse(jsonText) as Record<string, unknown>;
      await apiFetch('/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify(parsed),
      });
      setSettings(parsed);
      setSaved(true);
      const hours = Number(parsed.pin_expiry_hours);
      if (Number.isFinite(hours) && hours > 0) {
        setPinExpiryDays(String(Math.round(hours / 24)));
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Invalid JSON or save failed');
    }
  }

  if (loading || !isSuperAdmin) return null;

  return (
    <div>
      <AdminPageHeader
        title="Site settings"
        description="Configure onboarding PIN lifetime, wallet rewards, and other platform values. Super admin only."
      />
      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {saved && <p className="mb-4 text-sm text-emerald-600">Advanced settings saved.</p>}
      {pinSaved && <p className="mb-4 text-sm text-emerald-600">PIN validity updated.</p>}

      <section className="hub-card mb-8 p-6">
        <h2 className="text-lg font-semibold text-[var(--color-hub-text)]">Onboarding PINs</h2>
        <p className="mt-1 text-sm text-[var(--color-hub-text-secondary)]">
          How long issued PINs stay valid before expiring (if unused). Applies to{' '}
          <strong>newly issued</strong> PINs only. Default is 14 days.
        </p>
        <form onSubmit={savePinExpiry} className="mt-4 flex flex-wrap items-end gap-4">
          <HubField label="PIN valid for (days)">
            <HubTextInput
              type="number"
              min={MIN_PIN_DAYS}
              max={MAX_PIN_DAYS}
              required
              value={pinExpiryDays}
              onChange={(e) => setPinExpiryDays(e.target.value)}
            />
          </HubField>
          <button type="submit" className={`${hubBtnPrimary} w-auto px-6`}>
            Save PIN validity
          </button>
        </form>
        <p className="mt-3 text-xs text-zinc-500">
          To extend PINs already issued, run the SQL in MANUAL_SETUP §2.6.4 in Supabase.
        </p>
      </section>

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Advanced (JSON)
      </h2>
      <form onSubmit={save}>
        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          rows={16}
          className="w-full rounded-xl border p-3 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button type="submit" className={`${hubBtnSecondary} mt-4`}>
          Save all settings (JSON)
        </button>
      </form>
      <p className="mt-4 text-xs text-zinc-500">
        Current keys loaded: {Object.keys(settings).join(', ') || 'none'}
      </p>

      <section className="mt-12 border-t border-[var(--color-hub-border)] pt-8">
        <h2 className="text-lg font-semibold text-[var(--color-hub-text)]">Academic session</h2>
        <p className="mt-1 text-sm text-[var(--color-hub-text-secondary)]">
          Manual level promotion and graduation. Suspended students are skipped automatically.
        </p>
        {sessionMsg && (
          <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{sessionMsg}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className={`${hubBtnSecondary} px-4 py-2 text-sm`}
            onClick={() =>
              void apiFetch<{ promote: unknown[]; skip: unknown[] }>('/admin/session/promote/preview')
                .then(setPromotePreview)
                .catch(() => setPromotePreview(null))
            }
          >
            Preview promote
          </button>
          <button
            type="button"
            className={`${hubBtnPrimary} px-4 py-2 text-sm`}
            onClick={() =>
              confirmSessionAction('PROMOTE', () =>
                void apiFetch<{ updated: number }>('/admin/session/promote', { method: 'POST' }).then(
                  (r) => {
                    setSessionMsg(`Promoted ${r.updated} member(s).`);
                    setPromotePreview(null);
                  },
                ),
              )
            }
          >
            Apply promote
          </button>
          <button
            type="button"
            className={`${hubBtnSecondary} px-4 py-2 text-sm`}
            onClick={() =>
              void apiFetch<{ year: number; graduate: unknown[]; skip: unknown[] }>(
                '/admin/session/graduate/preview',
              )
                .then(setGraduatePreview)
                .catch(() => setGraduatePreview(null))
            }
          >
            Preview graduate
          </button>
          <button
            type="button"
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm text-white"
            onClick={() =>
              confirmSessionAction('GRADUATE', () =>
                void apiFetch<{ updated: number; year: number }>('/admin/session/graduate', {
                  method: 'POST',
                }).then((r) => {
                  setSessionMsg(`Graduated ${r.updated} member(s) for ${r.year}.`);
                  setGraduatePreview(null);
                }),
              )
            }
          >
            Apply graduate
          </button>
        </div>
        {promotePreview && (
          <p className="mt-3 text-sm text-zinc-600">
            Promote: {promotePreview.promote.length} · Skip: {promotePreview.skip.length}
          </p>
        )}
        {graduatePreview && (
          <p className="mt-3 text-sm text-zinc-600">
            Graduate ({graduatePreview.year}): {graduatePreview.graduate.length} · Skip:{' '}
            {graduatePreview.skip.length}
          </p>
        )}
      </section>
    </div>
  );
}
