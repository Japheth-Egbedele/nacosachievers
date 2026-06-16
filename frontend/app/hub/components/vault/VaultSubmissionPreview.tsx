'use client';

import { useEffect, useState } from 'react';
import { SpinnerCenter } from '@/app/components/Spinner';
import { apiFetch, ApiClientError } from '@/lib/api';
import { hubBtnSecondary } from '@/lib/hub-styles';

type PreviewFile = {
  id: string;
  file_name: string;
  content_mime: string;
  preview_url: string;
};

type VaultSubmissionPreviewProps = {
  uploadId: string;
  title: string;
  onClose: () => void;
};

function isImageMime(mime: string) {
  return mime.startsWith('image/');
}

function isPdfMime(mime: string) {
  return mime === 'application/pdf';
}

export default function VaultSubmissionPreview({
  uploadId,
  title,
  onClose,
}: VaultSubmissionPreviewProps) {
  const [files, setFiles] = useState<PreviewFile[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError('');
      apiFetch<{ files: PreviewFile[] }>(`/vault/uploads/${uploadId}/preview`)
        .then((data) => {
          setFiles(data.files);
          setActiveIndex(0);
        })
        .catch((err) => {
          setError(err instanceof ApiClientError ? err.message : 'Failed to load preview');
          setFiles([]);
        })
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [uploadId]);

  const active = files[activeIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div className="min-w-0">
            <h3 className="font-semibold text-zinc-900 dark:text-white">Preview submission</h3>
            <p className="mt-1 truncate text-sm text-zinc-500">{title}</p>
          </div>
          <button type="button" onClick={onClose} className={hubBtnSecondary}>
            Close
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5">
          {loading && <SpinnerCenter label="Loading preview…" />}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!loading && !error && active && (
            <div className="space-y-4">
              {files.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {files.map((f, i) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setActiveIndex(i)}
                      className={`rounded-lg border px-3 py-1.5 text-xs ${
                        i === activeIndex
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                          : 'border-zinc-200 text-zinc-600 dark:border-zinc-700'
                      }`}
                    >
                      Page {i + 1}
                    </button>
                  ))}
                </div>
              )}

              {isPdfMime(active.content_mime) && (
                <iframe
                  title={active.file_name}
                  src={active.preview_url}
                  className="h-[min(70vh,600px)] w-full rounded-lg border border-zinc-200 dark:border-zinc-700"
                />
              )}

              {isImageMime(active.content_mime) && (
                <img
                  src={active.preview_url}
                  alt={active.file_name}
                  className="mx-auto max-h-[min(70vh,600px)] max-w-full rounded-lg object-contain"
                  loading="lazy"
                />
              )}

              {!isPdfMime(active.content_mime) && !isImageMime(active.content_mime) && (
                <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-600">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Inline preview is not available for this file type ({active.content_mime}).
                  </p>
                  <a
                    href={active.preview_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-block text-sm font-medium text-emerald-600 hover:underline"
                  >
                    Open file in new tab
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
