'use client';

import { useEffect } from 'react';
import { hubBtnSecondary } from '@/lib/hub-styles';

type LightboxFile = {
  id: string;
  url: string;
  file_name: string;
  content_mime: string;
};

type VaultImageLightboxProps = {
  title: string;
  files: LightboxFile[];
  activeIndex: number;
  onChangeIndex: (next: number) => void;
  onClose: () => void;
  onDownload: (fileId?: string) => void;
};

export default function VaultImageLightbox({
  title,
  files,
  activeIndex,
  onChangeIndex,
  onClose,
  onDownload,
}: VaultImageLightboxProps) {
  const active = files[activeIndex];

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onChangeIndex(Math.max(0, activeIndex - 1));
      if (e.key === 'ArrowRight') onChangeIndex(Math.min(files.length - 1, activeIndex + 1));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, files.length, onChangeIndex, onClose]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70">
      <div className="absolute inset-0 p-4">
        <div className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-zinc-900">
          <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
            <div className="min-w-0">
              <h3 className="font-semibold text-zinc-900 dark:text-white">Past question pages</h3>
              <p className="mt-1 truncate text-sm text-zinc-500">{title}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => onDownload(active.id)} className={hubBtnSecondary}>
                Download
              </button>
              <button type="button" onClick={onClose} className={hubBtnSecondary}>
                ✕
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-black/5 p-4 dark:bg-black/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={active.url}
              alt={active.file_name}
              className="mx-auto max-h-[70vh] max-w-full rounded-lg object-contain"
            />
          </div>

          {files.length > 1 && (
            <div className="flex items-center justify-between gap-3 border-t border-zinc-200 px-5 py-3 text-sm dark:border-zinc-800">
              <button
                type="button"
                onClick={() => onChangeIndex(Math.max(0, activeIndex - 1))}
                disabled={activeIndex === 0}
                className="text-emerald-700 disabled:opacity-40 dark:text-emerald-300"
              >
                ← Prev
              </button>
              <div className="text-zinc-600 dark:text-zinc-400">
                Page <strong>{activeIndex + 1}</strong> of <strong>{files.length}</strong>
              </div>
              <button
                type="button"
                onClick={() => onChangeIndex(Math.min(files.length - 1, activeIndex + 1))}
                disabled={activeIndex === files.length - 1}
                className="text-emerald-700 disabled:opacity-40 dark:text-emerald-300"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

