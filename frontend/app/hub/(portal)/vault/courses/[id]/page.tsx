'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { SpinnerCenter } from '@/app/components/Spinner';
import HubAlert from '@/app/hub/components/ui/HubAlert';
import { HubList, HubListCard, HubListEmpty } from '@/app/hub/components/ui/HubListCard';
import HubPageHeader from '@/app/hub/components/ui/HubPageHeader';
import { hubBtnSecondary, hubLink } from '@/lib/hub-styles';
import { apiFetch, ApiClientError } from '@/lib/api';
import { formatCourseUnits } from '@/lib/vault-format';
import VaultImageLightbox from '@/app/hub/components/vault/VaultImageLightbox';

interface VaultFile {
  id: string;
  file_name: string;
  content_mime: string;
  sort_order: number;
}

interface VaultPacket {
  id: string;
  title: string;
  upload_kind: string;
  download_count: number;
  created_at: string;
  page_count?: number;
  files?: VaultFile[];
}

interface CourseDetail {
  course: {
    id: string;
    course_code: string;
    course_name: string;
    level: string;
    semester?: string;
    units?: number | null;
  };
  past_questions: VaultPacket[];
  course_materials: VaultPacket[];
}

export default function VaultCoursePage() {
  const params = useParams();
  const courseId = params.id as string;
  const [data, setData] = useState<CourseDetail | null>(null);
  const [galleryUrls, setGalleryUrls] = useState<
    Record<string, { id: string; url: string; file_name: string; content_mime: string }[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [flagTarget, setFlagTarget] = useState<{ id: string; title: string } | null>(null);
  const [flagReason, setFlagReason] = useState('');
  const [flagBusy, setFlagBusy] = useState(false);

  const [lightbox, setLightbox] = useState<{ uploadId: string; title: string; index: number } | null>(
    null,
  );

  useEffect(() => {
    apiFetch<CourseDetail>(`/vault/courses/${courseId}`)
      .then(setData)
      .catch(() => setError('Course not found'))
      .finally(() => setLoading(false));
  }, [courseId]);

  async function loadGallery(uploadId: string) {
    try {
      const files = await apiFetch<
        { id: string; url: string; file_name: string; content_mime: string }[]
      >(`/vault/uploads/${uploadId}/files`);
      setGalleryUrls((prev) => ({ ...prev, [uploadId]: files }));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load images');
    }
  }

  const activeLightboxFiles = useMemo(() => {
    if (!lightbox) return null;
    const files = galleryUrls[lightbox.uploadId];
    if (!files?.length) return null;
    const images = files.filter((f) => f.content_mime?.startsWith('image/'));
    if (!images.length) return null;
    return images;
  }, [galleryUrls, lightbox]);

  async function download(uploadId: string, fileId?: string) {
    const q = fileId ? `?file_id=${fileId}` : '';
    const res = await apiFetch<{ download_url: string }>(`/vault/uploads/${uploadId}/download${q}`);
    window.open(res.download_url, '_blank', 'noopener,noreferrer');
  }

  async function submitFlag() {
    if (!flagTarget || !flagReason.trim()) return;
    setFlagBusy(true);
    setError('');
    try {
      await apiFetch(`/vault/uploads/${flagTarget.id}/flag`, {
        method: 'POST',
        body: JSON.stringify({ reason: flagReason.trim() }),
      });
      setFlagTarget(null);
      setFlagReason('');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to submit report');
    } finally {
      setFlagBusy(false);
    }
  }

  if (loading) return <SpinnerCenter label="Loading course…" />;
  if (!data) return <HubAlert variant="error">{error || 'Not found'}</HubAlert>;

  const { course, past_questions, course_materials } = data;

  return (
    <div>
      <Link href="/hub/vault" className={`mb-4 inline-block text-sm ${hubLink}`}>
        ← Back to vault
      </Link>
      <HubPageHeader
        title={`${course.course_code} — ${course.course_name}`}
        description={`Level ${course.level}${course.semester ? ` · Semester ${course.semester}` : ''}${course.units != null ? ` · ${formatCourseUnits(course.units)}` : ''}`}
      />
      {error && <HubAlert variant="error" className="mb-4">{error}</HubAlert>}

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Past questions</h2>
        <HubList className="mt-3">
          {past_questions.length === 0 && <HubListEmpty title="No past questions yet" />}
          {past_questions.map((pq) => (
            <HubListCard key={pq.id}>
              <div className="w-full">
                <p className="font-medium">{pq.title}</p>
                <p className="text-xs text-[var(--color-hub-text-secondary)]">
                  {pq.page_count && pq.page_count > 1 ? `${pq.page_count} pages · ` : ''}
                  Uploaded {new Date(pq.created_at).toLocaleDateString()}
                </p>
                {!galleryUrls[pq.id] ? (
                  <button type="button" className={`mt-2 ${hubLink}`} onClick={() => void loadGallery(pq.id)}>
                    View pages
                  </button>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {galleryUrls[pq.id]!.map((f) =>
                      f.content_mime?.startsWith('image/') ? (
                        <button
                          key={f.id}
                          type="button"
                          className="block w-20 overflow-hidden rounded border"
                          onClick={() =>
                            setLightbox({
                              uploadId: pq.id,
                              title: pq.title,
                              index: Math.max(
                                0,
                                galleryUrls[pq.id]!
                                  .filter((x) => x.content_mime?.startsWith('image/'))
                                  .findIndex((x) => x.id === f.id),
                              ),
                            })
                          }
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={f.url} alt={f.file_name} className="h-24 w-full object-cover" />
                        </button>
                      ) : (
                        <button
                          key={f.id}
                          type="button"
                          className={hubBtnSecondary}
                          onClick={() => void download(pq.id, f.id)}
                        >
                          PDF download
                        </button>
                      ),
                    )}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-3 text-xs">
                  <button
                    type="button"
                    className="font-medium text-emerald-700 hover:underline dark:text-emerald-300"
                    onClick={() => setFlagTarget({ id: pq.id, title: pq.title })}
                  >
                    Report issue
                  </button>
                </div>
              </div>
            </HubListCard>
          ))}
        </HubList>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Course materials</h2>
        <HubList className="mt-3">
          {course_materials.length === 0 && <HubListEmpty title="No materials yet" />}
          {course_materials.map((m) => (
            <HubListCard key={m.id}>
              <div>
                <p className="font-medium">{m.title}</p>
                <p className="text-xs text-[var(--color-hub-text-secondary)]">
                  {new Date(m.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" className={hubLink} onClick={() => void download(m.id)}>
                  Download
                </button>
                <button
                  type="button"
                  className="text-xs font-medium text-zinc-500 hover:underline"
                  onClick={() => setFlagTarget({ id: m.id, title: m.title })}
                >
                  Report
                </button>
              </div>
            </HubListCard>
          ))}
        </HubList>
      </section>

      {lightbox && activeLightboxFiles && (
        <VaultImageLightbox
          title={lightbox.title}
          files={activeLightboxFiles}
          activeIndex={Math.min(lightbox.index, activeLightboxFiles.length - 1)}
          onChangeIndex={(next) => setLightbox({ ...lightbox, index: next })}
          onClose={() => setLightbox(null)}
          onDownload={(fileId) => void download(lightbox.uploadId, fileId)}
        />
      )}

      {flagTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
            <div>
              <h3 className="text-lg font-bold">Report content</h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{flagTarget.title}</p>
            </div>
            <div>
              <label className="text-sm font-medium">What’s wrong?</label>
              <textarea
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                placeholder="e.g. wrong course, missing pages, blurry images, wrong title…"
                className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                rows={4}
              />
              <p className="mt-2 text-xs text-zinc-500">Keep it short and specific (max 500 chars).</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={flagBusy || !flagReason.trim()}
                onClick={() => void submitFlag()}
                className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {flagBusy ? 'Sending…' : 'Send report'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFlagTarget(null);
                  setFlagReason('');
                }}
                className="flex-1 rounded-lg border py-2 text-sm dark:border-zinc-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
