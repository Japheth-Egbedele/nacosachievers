'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SpinnerCenter } from '@/app/components/Spinner';
import HubAlert from '@/app/hub/components/ui/HubAlert';
import HubField, { HubTextInput } from '@/app/hub/components/ui/HubField';
import { HubList, HubListCard, HubListEmpty } from '@/app/hub/components/ui/HubListCard';
import HubPageHeader from '@/app/hub/components/ui/HubPageHeader';
import HubPillTabs from '@/app/hub/components/ui/HubPillTabs';
import { hubBtnPrimary, hubBtnSecondary, hubLink } from '@/lib/hub-styles';
import { apiFetch, apiFetchPaginated, ApiClientError } from '@/lib/api';
import { compressVaultImage } from '@/lib/vault-compress';
import {
  acceptForKind,
  formatBytes,
  hashFile,
  maxBytesForKind,
  sizeWarningLevel,
  type UploadKind,
  type UploadLimits,
} from '@/lib/vault-format';
import { uploadVaultPacket } from '@/lib/vault-upload';

interface Course {
  id: string;
  course_code: string;
  course_name: string;
  level: string;
  semester?: string;
  past_question_count?: number;
  course_material_count?: number;
}

interface UploadFile {
  id: string;
  file_name: string;
  content_mime: string;
  sort_order: number;
}

interface Upload {
  id: string;
  title: string;
  status: string;
  upload_kind?: string;
  created_at: string;
  rejection_reason?: string | null;
  files?: UploadFile[];
  page_count?: number;
}

const LEVELS = ['100', '200', '300', '400'] as const;
const tabs = [
  { key: 'browse', label: 'Browse' },
  { key: 'mine', label: 'My uploads' },
  { key: 'upload', label: 'Upload' },
] as const;

type VaultTab = (typeof tabs)[number]['key'];

type QueueStatus = 'waiting' | 'uploading' | 'done' | 'failed';

interface QueueItem {
  key: string;
  title: string;
  files: File[];
  uploadKind: UploadKind;
  originalBytes?: number;
  compressedBytes?: number;
  duplicateWarning?: boolean;
  duplicateDismissed?: boolean;
  status: QueueStatus;
  progress: number;
  error?: string;
}

function titleFromFilename(name: string): string {
  return name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
}

export default function VaultPage() {
  const [tab, setTab] = useState<VaultTab>('browse');
  const [browseLevel, setBrowseLevel] = useState<string>('100');
  const [courses, setCourses] = useState<Course[]>([]);
  const [myUploads, setMyUploads] = useState<Upload[]>([]);
  const [limits, setLimits] = useState<UploadLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [uploadLevel, setUploadLevel] = useState<string>('100');
  const [uploadKind, setUploadKind] = useState<UploadKind>('course_material');
  const [courseId, setCourseId] = useState('');
  const [pqTitle, setPqTitle] = useState('');
  const [pqImages, setPqImages] = useState<
    { key: string; file: File; originalBytes: number; compressedBytes: number; preview: string }[]
  >([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [uploadBusy, setUploadBusy] = useState(false);

  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const materialsRef = useRef<HTMLInputElement>(null);

  const loadLimits = useCallback(() => {
    apiFetch<UploadLimits>('/vault/upload-limits')
      .then(setLimits)
      .catch(() =>
        setLimits({
          max_material_bytes: 45 * 1024 * 1024,
          max_image_bytes: 8 * 1024 * 1024,
          batch_queue_max: 20,
          default_credit_reward: 10,
        }),
      );
  }, []);

  const loadCourses = useCallback((level: string) => {
    setLoading(true);
    apiFetchPaginated<Course>(`/vault/courses?level=${level}&limit=100`)
      .then((r) => setCourses(r.items))
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

  useEffect(() => {
    loadLimits();
  }, [loadLimits]);

  useEffect(() => {
    setError('');
    setSuccess('');
    if (tab === 'browse') loadCourses(browseLevel);
    else if (tab === 'mine') loadMyUploads();
    else {
      setLoading(false);
      loadCourses(uploadLevel);
    }
  }, [tab, browseLevel, uploadLevel, loadCourses, loadMyUploads]);

  const uploadCourses = useMemo(
    () => courses.filter((c) => c.level === uploadLevel),
    [courses, uploadLevel],
  );

  async function checkDuplicate(file: File, kind: UploadKind): Promise<boolean> {
    if (!courseId) return false;
    try {
      const hash = await hashFile(file);
      const q = new URLSearchParams({
        course_id: courseId,
        upload_kind: kind,
        file_name: file.name,
        content_hash: hash,
      });
      const res = await apiFetch<{ duplicate: boolean }>(`/vault/uploads/duplicate-check?${q}`);
      return res.duplicate;
    } catch {
      return false;
    }
  }

  async function addMaterialFiles(fileList: FileList | null) {
    if (!fileList?.length || !limits) return;
    setError('');
    const max = limits.batch_queue_max;
    const remaining = max - queue.length;
    const toAdd = Array.from(fileList).slice(0, remaining);

    const newItems: QueueItem[] = [];
    for (const file of toAdd) {
      const dup = await checkDuplicate(file, 'course_material');
      newItems.push({
        key: crypto.randomUUID(),
        title: titleFromFilename(file.name),
        files: [file],
        uploadKind: 'course_material',
        duplicateWarning: dup,
        status: 'waiting',
        progress: 0,
      });
    }
    setQueue((q) => [...q, ...newItems]);
  }

  async function addPastQuestionImages(fileList: FileList | null) {
    if (!fileList?.length || !limits) return;
    setError('');
    const next: typeof pqImages = [];
    for (const raw of Array.from(fileList)) {
      if (pqImages.length + next.length >= 20) break;
      const { file, originalBytes, compressedBytes } = await compressVaultImage(raw);
      if (compressedBytes > limits.max_image_bytes) {
        setError(`${raw.name} is still too large after compression. Try a smaller photo.`);
        continue;
      }
      next.push({
        key: crypto.randomUUID(),
        file,
        originalBytes,
        compressedBytes,
        preview: URL.createObjectURL(file),
      });
    }
    setPqImages((prev) => [...prev, ...next]);
  }

  function addPastQuestionToQueue() {
    if (!courseId || !pqTitle.trim() || !pqImages.length) {
      setError('Select a course, enter a title, and add at least one photo');
      return;
    }
    setQueue((q) => [
      ...q,
      {
        key: crypto.randomUUID(),
        title: pqTitle.trim(),
        files: pqImages.map((p) => p.file),
        uploadKind: 'past_question',
        originalBytes: pqImages.reduce((s, p) => s + p.originalBytes, 0),
        compressedBytes: pqImages.reduce((s, p) => s + p.compressedBytes, 0),
        status: 'waiting',
        progress: 0,
      },
    ]);
    setPqTitle('');
    pqImages.forEach((p) => URL.revokeObjectURL(p.preview));
    setPqImages([]);
  }

  async function runQueue() {
    if (!courseId || !queue.length) return;
    setUploadBusy(true);
    setError('');
    let done = 0;

    const updateItem = (key: string, patch: Partial<QueueItem>) => {
      setQueue((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
    };

    for (const item of queue) {
      if (item.status === 'done') {
        done++;
        continue;
      }
      const overLimit = item.files.some((f) => {
        const isImg = f.type.startsWith('image/');
        const max = maxBytesForKind(item.uploadKind, limits!, isImg);
        return f.size > max;
      });
      if (overLimit) {
        updateItem(item.key, { status: 'failed', error: 'File exceeds size limit' });
        continue;
      }

      updateItem(item.key, { status: 'uploading', progress: 0, error: undefined });
      try {
        const hash = item.files.length === 1 ? await hashFile(item.files[0]!) : undefined;
        await uploadVaultPacket({
          course_id: courseId,
          title: item.title,
          upload_kind: item.uploadKind,
          files: item.files,
          content_hash: hash,
          onFileProgress: (_i, pct) => updateItem(item.key, { progress: pct }),
        });
        updateItem(item.key, { status: 'done', progress: 100 });
        done++;
      } catch (err) {
        updateItem(item.key, {
          status: 'failed',
          error: err instanceof Error ? err.message : 'Upload failed',
        });
      }
    }

    setUploadBusy(false);
    if (done > 0) {
      setSuccess(`${done} upload(s) submitted for review.`);
      setQueue((q) => q.filter((i) => i.status !== 'done'));
    }
  }

  async function downloadUpload(id: string, fileId?: string) {
    setError('');
    try {
      const q = fileId ? `?file_id=${fileId}` : '';
      const data = await apiFetch<{ download_url: string }>(`/vault/uploads/${id}/download${q}`);
      window.open(data.download_url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Download failed');
    }
  }

  const limitCallout = limits && (
    <HubAlert variant="info" className="text-sm">
      {uploadKind === 'course_material' ? (
        <>
          Each file must be <strong>{formatBytes(limits.max_material_bytes)}</strong> or smaller.
          If your PDF is too big, compress it first (e.g.{' '}
          <a href="https://smallpdf.com/compress-pdf" target="_blank" rel="noreferrer" className="underline">
            Smallpdf
          </a>
          , Adobe &quot;Reduce file size&quot;, or &quot;Save as reduced size PDF&quot; on your phone) before
          adding it here.
        </>
      ) : (
        <>
          Photos are automatically compressed when you add them (max{' '}
          <strong>{formatBytes(limits.max_image_bytes)}</strong> each). Use clear photos; we optimize them
          for you. You can also upload one PDF past paper instead.
        </>
      )}
    </HubAlert>
  );

  return (
    <div>
      <HubPageHeader
        title="Course vault"
        description="Browse materials by level, upload past questions or course handouts, and earn credits when approved."
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
              <div className="mb-4 flex flex-wrap gap-2">
                {LEVELS.map((lv) => (
                  <button
                    key={lv}
                    type="button"
                    onClick={() => setBrowseLevel(lv)}
                    className={
                      browseLevel === lv
                        ? 'rounded-full bg-[var(--color-brand)] px-4 py-1.5 text-sm font-medium text-white'
                        : 'rounded-full border border-[var(--color-hub-border)] px-4 py-1.5 text-sm'
                    }
                  >
                    L{lv}
                  </button>
                ))}
              </div>
              <HubList>
                {courses.length === 0 && <HubListEmpty title={`No L${browseLevel} courses yet`} />}
                {courses.map((c) => (
                  <HubListCard key={c.id} className="block">
                    <Link href={`/hub/vault/courses/${c.id}`} className="flex w-full justify-between gap-4">
                      <div>
                        <span className="font-mono text-xs text-[var(--color-brand)]">{c.course_code}</span>
                        <span className="text-[var(--color-hub-text)]"> — {c.course_name}</span>
                        <p className="mt-0.5 text-xs text-[var(--color-hub-text-secondary)]">
                          Level {c.level}
                          {c.semester ? ` · Semester ${c.semester}` : ''}
                        </p>
                      </div>
                      <div className="shrink-0 text-right text-xs text-[var(--color-hub-text-secondary)]">
                        <div>{c.past_question_count ?? 0} past Q</div>
                        <div>{c.course_material_count ?? 0} materials</div>
                      </div>
                    </Link>
                  </HubListCard>
                ))}
              </HubList>
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
                      {u.upload_kind?.replace('_', ' ') ?? 'upload'} · {u.status}
                      {u.page_count && u.page_count > 1 ? ` · ${u.page_count} pages` : ''}
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

          {tab === 'upload' && limits && (
            <div className="mt-6 max-w-2xl space-y-5">
              <div className="flex flex-wrap gap-2">
                {LEVELS.map((lv) => (
                  <button
                    key={lv}
                    type="button"
                    onClick={() => {
                      setUploadLevel(lv);
                      setCourseId('');
                    }}
                    className={
                      uploadLevel === lv
                        ? 'rounded-full bg-[var(--color-brand)] px-4 py-1.5 text-sm font-medium text-white'
                        : 'rounded-full border border-[var(--color-hub-border)] px-4 py-1.5 text-sm'
                    }
                  >
                    L{lv}
                  </button>
                ))}
              </div>

              <HubField label="Upload type">
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ['past_question', 'Past questions'],
                      ['course_material', 'Course materials'],
                    ] as const
                  ).map(([k, label]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setUploadKind(k)}
                      className={
                        uploadKind === k
                          ? 'rounded-lg bg-[var(--color-brand-soft)] px-3 py-2 text-sm font-medium text-[var(--color-brand)]'
                          : 'rounded-lg border border-[var(--color-hub-border)] px-3 py-2 text-sm'
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </HubField>

              <HubField label="Course">
                <select
                  required
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="hub-input w-full rounded-xl px-3.5 py-2.5 text-sm"
                >
                  <option value="">— Select course —</option>
                  {uploadCourses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.course_code} — {c.course_name}
                    </option>
                  ))}
                </select>
              </HubField>

              <HubAlert variant="info" className="text-sm">
                Default reward: <strong>{limits.default_credit_reward} credits</strong> per approved upload
                (set by chapter). Reach out to excos for current points policy — approval is not guaranteed
                until reviewed.
              </HubAlert>

              {limitCallout}

              {uploadKind === 'past_question' ? (
                <>
                  <HubField label="Title for this past-question set">
                    <HubTextInput
                      value={pqTitle}
                      onChange={(e) => setPqTitle(e.target.value)}
                      placeholder="e.g. CSC 201 — 2024 final exam"
                    />
                  </HubField>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={hubBtnSecondary} onClick={() => galleryRef.current?.click()}>
                      Gallery
                    </button>
                    <button type="button" className={hubBtnSecondary} onClick={() => cameraRef.current?.click()}>
                      Take photo
                    </button>
                    <input
                      ref={galleryRef}
                      type="file"
                      accept={acceptForKind('past_question')}
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        void addPastQuestionImages(e.target.files);
                        e.target.value = '';
                      }}
                    />
                    <input
                      ref={cameraRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        void addPastQuestionImages(e.target.files);
                        e.target.value = '';
                      }}
                    />
                  </div>
                  {pqImages.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-[var(--color-hub-text-secondary)]">
                        {pqImages.length} page(s) — drag order with move buttons
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {pqImages.map((img, idx) => (
                          <div key={img.key} className="relative w-24 rounded-lg border p-1 text-center text-[10px]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img.preview} alt="" className="h-20 w-full rounded object-cover" />
                            <p>
                              {formatBytes(img.originalBytes)} → {formatBytes(img.compressedBytes)}
                            </p>
                            <div className="mt-1 flex justify-center gap-1">
                              <button
                                type="button"
                                className="text-[var(--color-brand)]"
                                disabled={idx === 0}
                                onClick={() =>
                                  setPqImages((prev) => {
                                    const n = [...prev];
                                    [n[idx - 1], n[idx]] = [n[idx]!, n[idx - 1]!];
                                    return n;
                                  })
                                }
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                className="text-red-600"
                                onClick={() =>
                                  setPqImages((prev) => prev.filter((p) => p.key !== img.key))
                                }
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button type="button" className={hubBtnSecondary} onClick={addPastQuestionToQueue}>
                        Add set to queue
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <HubField label="Files (PDF, DOC, DOCX) — select many for batch upload">
                  <button type="button" className={hubBtnSecondary} onClick={() => materialsRef.current?.click()}>
                    Choose files
                  </button>
                  <input
                    ref={materialsRef}
                    type="file"
                    accept={acceptForKind('course_material')}
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      void addMaterialFiles(e.target.files);
                      e.target.value = '';
                    }}
                  />
                </HubField>
              )}

              {queue.length > 0 && (
                <div className="space-y-3 rounded-xl border border-[var(--color-hub-border)] p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Upload queue ({queue.length})</h3>
                    <button type="button" className="text-xs text-red-600" onClick={() => setQueue([])}>
                      Clear
                    </button>
                  </div>
                  {limitCallout}
                  {queue.map((item) => {
                    const file = item.files[0]!;
                    const isImg = file.type.startsWith('image/');
                    const max = maxBytesForKind(item.uploadKind, limits, isImg);
                    const totalSize = item.files.reduce((s, f) => s + f.size, 0);
                    const level = sizeWarningLevel(totalSize, max);
                    return (
                      <div key={item.key} className="rounded-lg bg-[var(--color-hub-surface-muted)] p-3 text-sm">
                        {item.duplicateWarning && !item.duplicateDismissed && (
                          <HubAlert variant="info" className="mb-2 border-amber-200 bg-amber-50 text-xs text-amber-900">
                            A similar file may already exist for this course.{' '}
                            <button
                              type="button"
                              className="underline"
                              onClick={() =>
                                setQueue((q) =>
                                  q.map((i) =>
                                    i.key === item.key ? { ...i, duplicateDismissed: true } : i,
                                  ),
                                )
                              }
                            >
                              Continue anyway
                            </button>{' '}
                            or remove from queue.
                          </HubAlert>
                        )}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <HubTextInput
                            value={item.title}
                            onChange={(e) =>
                              setQueue((q) =>
                                q.map((i) => (i.key === item.key ? { ...i, title: e.target.value } : i)),
                              )
                            }
                            className="min-w-[12rem] flex-1"
                          />
                          <span
                            className={
                              level === 'over'
                                ? 'text-red-600'
                                : level === 'warn'
                                  ? 'text-amber-600'
                                  : 'text-[var(--color-hub-text-secondary)]'
                            }
                          >
                            {formatBytes(totalSize)} / {formatBytes(max)}
                            {level === 'warn' && ' — large file'}
                            {level === 'over' && ' — too large, compress first'}
                          </span>
                          <span className="capitalize text-xs">{item.status}</span>
                        </div>
                        {item.status === 'uploading' && (
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200">
                            <div
                              className="h-full bg-[var(--color-brand)] transition-all"
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                        )}
                        {item.error && <p className="mt-1 text-xs text-red-600">{item.error}</p>}
                        {item.status === 'failed' && (
                          <button
                            type="button"
                            className={`mt-2 ${hubLink}`}
                            onClick={() =>
                              setQueue((q) =>
                                q.map((i) =>
                                  i.key === item.key ? { ...i, status: 'waiting', progress: 0, error: undefined } : i,
                                ),
                              )
                            }
                          >
                            Retry
                          </button>
                        )}
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    disabled={uploadBusy || !courseId || queue.every((i) => i.status === 'done')}
                    className={hubBtnPrimary}
                    onClick={() => void runQueue()}
                  >
                    {uploadBusy ? 'Uploading…' : `Upload all (${queue.filter((i) => i.status !== 'done').length})`}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
