'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SpinnerCenter } from '@/app/components/Spinner';
import HubAlert from '@/app/hub/components/ui/HubAlert';
import { HubList, HubListCard, HubListEmpty } from '@/app/hub/components/ui/HubListCard';
import HubPageHeader from '@/app/hub/components/ui/HubPageHeader';
import { hubBtnSecondary, hubLink } from '@/lib/hub-styles';
import { apiFetch, ApiClientError } from '@/lib/api';

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

  async function download(uploadId: string, fileId?: string) {
    const q = fileId ? `?file_id=${fileId}` : '';
    const res = await apiFetch<{ download_url: string }>(`/vault/uploads/${uploadId}/download${q}`);
    window.open(res.download_url, '_blank', 'noopener,noreferrer');
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
        description={`Level ${course.level}${course.semester ? ` · Semester ${course.semester}` : ''}`}
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
                  {pq.download_count} downloads
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
                          onClick={() => void download(pq.id, f.id)}
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
                  {m.download_count} downloads · {new Date(m.created_at).toLocaleDateString()}
                </p>
              </div>
              <button type="button" className={hubLink} onClick={() => void download(m.id)}>
                Download
              </button>
            </HubListCard>
          ))}
        </HubList>
      </section>
    </div>
  );
}
