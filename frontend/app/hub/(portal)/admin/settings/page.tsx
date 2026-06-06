'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import { apiFetch, ApiClientError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function AdminSettingsPage() {
  const { isSuperAdmin, loading } = useAuth();
  const router = useRouter();
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [jsonText, setJsonText] = useState('');
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

  useEffect(() => {
    if (!loading && !isSuperAdmin) router.replace('/hub/admin');
  }, [loading, isSuperAdmin, router]);

  useEffect(() => {
    if (isSuperAdmin) {
      apiFetch<Record<string, unknown>>('/admin/settings')
        .then((s) => {
          setSettings(s);
          setJsonText(JSON.stringify(s, null, 2));
        })
        .catch(() => setSettings({}));
    }
  }, [isSuperAdmin]);

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
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Invalid JSON or save failed');
    }
  }

  if (loading || !isSuperAdmin) return null;

  return (
    <div>
      <AdminPageHeader
        title="Site settings"
        description="Key-value site settings (wallet rewards, career bounty, etc.). Super admin only."
      />
      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {saved && <p className="mb-4 text-sm text-emerald-600">Saved.</p>}
      <form onSubmit={save}>
        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          rows={16}
          className="w-full font-mono text-xs rounded-xl border p-3 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button type="submit" className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white">
          Save settings
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
            className="hub-btn-secondary px-4 py-2 text-sm"
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
            className="hub-btn-primary px-4 py-2 text-sm"
            onClick={() =>
              void apiFetch<{ updated: number }>('/admin/session/promote', { method: 'POST' }).then(
                (r) => {
                  setSessionMsg(`Promoted ${r.updated} member(s).`);
                  setPromotePreview(null);
                },
              )
            }
          >
            Apply promote
          </button>
          <button
            type="button"
            className="hub-btn-secondary px-4 py-2 text-sm"
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
              void apiFetch<{ updated: number; year: number }>('/admin/session/graduate', {
                method: 'POST',
              }).then((r) => {
                setSessionMsg(`Graduated ${r.updated} member(s) for ${r.year}.`);
                setGraduatePreview(null);
              })
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
