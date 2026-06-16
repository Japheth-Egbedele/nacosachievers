'use client';

import { useCallback, useEffect, useState } from 'react';
import PasswordInput from '@/app/components/PasswordInput';
import { SpinnerCenter } from '@/app/components/Spinner';
import HubAlert from '@/app/hub/components/ui/HubAlert';
import HubField, { HubTextInput } from '@/app/hub/components/ui/HubField';
import HubPageHeader from '@/app/hub/components/ui/HubPageHeader';
import { hubBtnPrimary } from '@/lib/hub-styles';
import { apiFetch, ApiClientError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface MeProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name?: string | null;
  bio?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  email_visible?: boolean;
  matric_number?: string;
  role: string;
}

export default function ProfilePage() {
  const { logout, refreshUser } = useAuth();
  const [profile, setProfile] = useState<MeProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [github, setGithub] = useState('');
  const [emailVisible, setEmailVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const me = await apiFetch<MeProfile>('/users/me');
      setProfile(me);
      setDisplayName(me.display_name ?? '');
      setBio(me.bio ?? '');
      setLinkedin(me.linkedin_url ?? '');
      setGithub(me.github_url ?? '');
      setEmailVisible(Boolean(me.email_visible));
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setBusy('profile');
    try {
      const updated = await apiFetch<MeProfile>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          display_name: displayName.trim() || undefined,
          bio: bio.trim() || undefined,
          linkedin_url: linkedin.trim() || null,
          github_url: github.trim() || null,
          email_visible: emailVisible,
        }),
      });
      setProfile(updated);
      await refreshUser();
      setSuccess('Profile updated.');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Update failed');
    } finally {
      setBusy('');
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setBusy('password');
    try {
      await apiFetch('/users/me/password', {
        method: 'PATCH',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      setCurrentPassword('');
      setNewPassword('');
      setSuccess('Password changed successfully.');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Password change failed');
    } finally {
      setBusy('');
    }
  }

  async function deleteAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmDelete) {
      setError('Check the box to confirm account deletion.');
      return;
    }
    setError('');
    setBusy('delete');
    try {
      await apiFetch('/users/me', {
        method: 'DELETE',
        body: JSON.stringify({ password: deletePassword }),
      });
      await logout();
      window.location.href = '/hub/login';
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not delete account');
    } finally {
      setBusy('');
    }
  }

  if (loading) return <SpinnerCenter label="Loading profile…" />;
  if (!profile) {
    return <HubAlert variant="error">Could not load your profile.</HubAlert>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <HubPageHeader
        title="Your profile"
        description="Manage how you appear in The Hub and keep your account secure."
      />

      {error && <HubAlert variant="error">{error}</HubAlert>}
      {success && <HubAlert variant="success">{success}</HubAlert>}

      <section className="hub-card-muted space-y-4 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-brand-soft)] text-xl font-bold text-[var(--color-brand)]">
            {(profile.first_name?.[0] ?? profile.email[0] ?? '?').toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-[var(--color-hub-text)]">
              {profile.first_name} {profile.last_name}
            </p>
            <p className="text-sm text-[var(--color-hub-text-secondary)]">{profile.email}</p>
            {profile.matric_number && (
              <p className="font-mono text-xs text-[var(--color-hub-muted)]">{profile.matric_number}</p>
            )}
          </div>
        </div>
      </section>

      <form onSubmit={saveProfile} className="hub-card space-y-5 p-6">
        <h2 className="text-lg font-semibold text-[var(--color-hub-text)]">Public details</h2>
        <HubField label="Display name">
          <HubTextInput
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={`${profile.first_name} ${profile.last_name}`}
          />
        </HubField>
        <HubField label="Bio" hint="A short intro visible on your profile">
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            className="hub-input w-full rounded-xl px-3.5 py-2.5 text-sm"
            placeholder="Tell members a little about you…"
          />
        </HubField>
        <HubField label="LinkedIn URL">
          <HubTextInput
            type="url"
            value={linkedin}
            onChange={(e) => setLinkedin(e.target.value)}
            placeholder="https://linkedin.com/in/…"
          />
        </HubField>
        <HubField label="GitHub URL">
          <HubTextInput
            type="url"
            value={github}
            onChange={(e) => setGithub(e.target.value)}
            placeholder="https://github.com/…"
          />
        </HubField>
        <label className="flex cursor-pointer items-center gap-3 text-sm text-[var(--color-hub-text-secondary)]">
          <input
            type="checkbox"
            checked={emailVisible}
            onChange={(e) => setEmailVisible(e.target.checked)}
            className="h-4 w-4 rounded border-[var(--color-hub-border)] text-[var(--color-brand)]"
          />
          Show my email on my public profile
        </label>
        <button type="submit" disabled={busy === 'profile'} className={`${hubBtnPrimary} w-auto px-8`}>
          {busy === 'profile' ? 'Saving…' : 'Save profile'}
        </button>
      </form>

      <form onSubmit={changePassword} className="hub-card space-y-5 p-6">
        <h2 className="text-lg font-semibold text-[var(--color-hub-text)]">Change password</h2>
        <HubField label="Current password">
          <PasswordInput
            value={currentPassword}
            onChange={setCurrentPassword}
            required
            className="rounded-xl border-[var(--color-hub-border)] py-2.5 pl-3.5"
          />
        </HubField>
        <HubField label="New password" hint="At least 8 characters">
          <PasswordInput
            value={newPassword}
            onChange={setNewPassword}
            required
            minLength={8}
            className="rounded-xl border-[var(--color-hub-border)] py-2.5 pl-3.5"
          />
        </HubField>
        <button type="submit" disabled={busy === 'password'} className={`${hubBtnPrimary} w-auto px-8`}>
          {busy === 'password' ? 'Updating…' : 'Update password'}
        </button>
      </form>

      <form onSubmit={deleteAccount} className="hub-card space-y-5 border-red-200/80 p-6 dark:border-red-900/50">
        <h2 className="text-lg font-semibold text-red-700 dark:text-red-400">Delete account</h2>
        <p className="text-sm text-[var(--color-hub-text-secondary)]">
          This deactivates your account. You will lose access to elections and chapter features.
        </p>
        <HubField label="Confirm with your password">
          <PasswordInput
            value={deletePassword}
            onChange={setDeletePassword}
            required
            className="rounded-xl border-[var(--color-hub-border)] py-2.5 pl-3.5"
          />
        </HubField>
        <label className="flex cursor-pointer items-start gap-3 text-sm text-[var(--color-hub-text-secondary)]">
          <input
            type="checkbox"
            checked={confirmDelete}
            onChange={(e) => setConfirmDelete(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-[var(--color-hub-border)] text-red-600"
          />
          I understand this action cannot be undone from the app.
        </label>
        <button
          type="submit"
          disabled={busy === 'delete'}
          className="inline-flex w-auto items-center justify-center rounded-xl bg-red-600 px-8 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
        >
          {busy === 'delete' ? 'Deleting…' : 'Delete my account'}
        </button>
      </form>
    </div>
  );
}
