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
    </div>
  );
}
