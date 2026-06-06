'use client';

import { useCallback, useEffect, useState } from 'react';
import { SpinnerCenter } from '@/app/components/Spinner';
import HubAlert from '@/app/hub/components/ui/HubAlert';
import HubField, { HubTextInput } from '@/app/hub/components/ui/HubField';
import { HubList, HubListCard, HubListEmpty } from '@/app/hub/components/ui/HubListCard';
import HubPageHeader from '@/app/hub/components/ui/HubPageHeader';
import HubPillTabs from '@/app/hub/components/ui/HubPillTabs';
import { hubBtnPrimary, hubBtnSecondary, hubLink } from '@/lib/hub-styles';
import { apiFetch, apiFetchPaginated, ApiClientError } from '@/lib/api';

interface Course {
  id: string;
  course_code: string;
  course_name: string;
  level: string;
  semester?: string;
}

interface Upload {
  id: string;
  title: string;
  status: string;
  created_at: string;
  course_id?: string;
  rejection_reason?: string | null;
}

const tabs = [
  { key: 'browse', label: 'Browse' },
  { key: 'mine', label: 'My uploads' },
  { key: 'upload', label: 'Upload' },
] as const;

type VaultTab = (typeof tabs)[number]['key'];

export default function VaultPage() {
  const [tab, setTab] = useState<VaultTab>('browse');
  const [courses, setCourses] = useState<Course[]>([]);
  const [myUploads, setMyUploads] = useState<Upload[]>([]);
  const [coursePage, setCoursePage] = useState(1);
  const [courseMeta, setCourseMeta] = useState({ total: 0, page: 1, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [courseId, setCourseId] = useState('');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);

  const loadCourses = useCallback((page = 1) => {
    setLoading(true);
    apiFetchPaginated<Course>(`/vault/courses?page=${page}&limit=20`)
      .then((r) => {
        setCourses(r.items);
        setCourseMeta(r.meta);
        setCoursePage(r.meta.page);
      })
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
  }, []);

  const loadMyUploads = useCallback(() => {
    setLoading(true);
    apiFetchPaginated<Upload>('/vault/uploads/mine?limit=50')
      .then((r) => setMyUploads(r.items))
      .catch(() => setMyUploads([]))
      .finally(() => setLoading(false));
  }, []);

  const loadCourseOptions = useCallback(() => {
    apiFetchPaginated<Course>('/vault/courses?limit=200')
      .then((r) => setCourses(r.items))
      .catch(() => setCourses([]));
  }, []);

  useEffect(() => {
    setError('');
    setSuccess('');
    if (tab === 'browse') loadCourses(coursePage);
    else if (tab === 'mine') loadMyUploads();
    else {
      setLoading(false);
      loadCourseOptions();
    }
  }, [tab, coursePage, loadCourses, loadMyUploads, loadCourseOptions]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!courseId || !title.trim() || !file) {
      setError('Course, title, and PDF file are required');
      return;
    }
    setUploadBusy(true);
    try {
      const form = new FormData();
      form.append('course_id', courseId);
      form.append('title', title.trim());
      form.append('file', file);
      await apiFetch('/vault/uploads', { method: 'POST', body: form });
      setTitle('');
      setFile(null);
      setCourseId('');
      setSuccess('Upload submitted for review.');
      setTab('mine');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Upload failed');
    } finally {
      setUploadBusy(false);
    }
  }

  async function downloadUpload(id: string) {
    setError('');
    try {
      const data = await apiFetch<{ url: string }>(`/vault/uploads/${id}/download`);
      window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Download failed');
    }
  }

  const coursePages = Math.max(1, Math.ceil(courseMeta.total / courseMeta.limit));

  return (
    <div>
      <HubPageHeader
        title="Course vault"
        description="Browse course materials shared by members. Upload PDFs for chapter review."
      />

      {error && <HubAlert variant="error" className="mb-4">{error}</HubAlert>}
      {success && <HubAlert variant="success" className="mb-4">{success}</HubAlert>}

      <HubPillTabs tabs={[...tabs]} active={tab} onChange={(k) => setTab(k as VaultTab)} />

      {loading && tab !== 'upload' ? (
        <div className="mt-8">
          <SpinnerCenter label="Loading vault…" />
        </div>
      ) : (
        <>
          {tab === 'browse' && (
            <div className="mt-6">
              <HubList>
                {courses.length === 0 && <HubListEmpty title="No courses yet" />}
                {courses.map((c) => (
                  <HubListCard key={c.id} className="block">
                    <div>
                      <span className="font-mono text-xs text-[var(--color-brand)]">{c.course_code}</span>
                      <span className="text-[var(--color-hub-text)]">
                        {' '}
                        — {c.course_name}
                      </span>
                      <p className="mt-0.5 text-xs text-[var(--color-hub-text-secondary)]">
                        Level {c.level}
                        {c.semester ? ` · ${c.semester} semester` : ''}
                      </p>
                    </div>
                  </HubListCard>
                ))}
              </HubList>
              {coursePages > 1 && (
                <div className="mt-4 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    disabled={coursePage <= 1}
                    onClick={() => setCoursePage((p) => p - 1)}
                    className={hubBtnSecondary}
                  >
                    Previous
                  </button>
                  <span className="text-sm text-[var(--color-hub-text-secondary)]">
                    Page {coursePage} of {coursePages}
                  </span>
                  <button
                    type="button"
                    disabled={coursePage >= coursePages}
                    onClick={() => setCoursePage((p) => p + 1)}
                    className={hubBtnSecondary}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === 'mine' && (
            <HubList className="mt-6">
              {myUploads.length === 0 && <HubListEmpty title="No uploads yet" />}
              {myUploads.map((u) => (
                <HubListCard key={u.id}>
                  <div>
                    <p className="font-medium">{u.title}</p>
                    <p className="text-xs capitalize text-[var(--color-hub-text-secondary)]">
                      {u.status}
                      {u.rejection_reason ? ` — ${u.rejection_reason}` : ''}
                    </p>
                    <p className="text-xs text-[var(--color-hub-muted)]">
                      {new Date(u.created_at).toLocaleString()}
                    </p>
                  </div>
                  {u.status === 'approved' && (
                    <button type="button" onClick={() => downloadUpload(u.id)} className={hubLink}>
                      Download
                    </button>
                  )}
                </HubListCard>
              ))}
            </HubList>
          )}

          {tab === 'upload' && (
            <form onSubmit={handleUpload} className="mt-6 max-w-lg space-y-5">
              <HubField label="Course" hint="Select the course this material belongs to">
                <select
                  required
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="hub-input w-full rounded-xl px-3.5 py-2.5 text-sm"
                >
                  <option value="">— Select course —</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.course_code} — {c.course_name} (L{c.level})
                    </option>
                  ))}
                </select>
              </HubField>
              <HubField label="Title">
                <HubTextInput
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. CSC 201 — Lecture notes week 3"
                />
              </HubField>
              <HubField label="PDF file" hint="Max size per chapter policy">
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  required
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-[var(--color-hub-text-secondary)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--color-brand-soft)] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[var(--color-brand)]"
                />
              </HubField>
              <button type="submit" disabled={uploadBusy} className={hubBtnPrimary}>
                {uploadBusy ? 'Uploading…' : 'Submit for review'}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
