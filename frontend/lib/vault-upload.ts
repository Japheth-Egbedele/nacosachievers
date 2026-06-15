import { apiFetch, loadStoredToken, API_BASE } from './api';
import type { UploadKind } from './vault-format';

export interface InitFileMeta {
  file_name: string;
  content_mime: string;
  file_size_bytes: number;
}

export interface SignedUploadFile {
  file_id: string;
  file_name: string;
  content_mime: string;
  signed_url: string;
  token: string;
  storage_path: string;
  sort_order: number;
}

export interface InitUploadResponse {
  upload_id: string;
  files: SignedUploadFile[];
}

export async function initVaultUpload(input: {
  course_id: string;
  title: string;
  upload_kind: UploadKind;
  content_hash?: string;
  files: InitFileMeta[];
}): Promise<InitUploadResponse> {
  return apiFetch<InitUploadResponse>('/vault/uploads/init', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function completeVaultUpload(uploadId: string): Promise<unknown> {
  return apiFetch(`/vault/uploads/${uploadId}/complete`, { method: 'POST' });
}

/**
 * PUT file to Supabase signed URL with upload progress.
 */
export function uploadToSignedUrl(
  signedUrl: string,
  file: File | Blob,
  contentType: string,
  onProgress?: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedUrl);
    xhr.setRequestHeader('Content-Type', contentType);
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(file);
  });
}

export async function uploadVaultPacket(input: {
  course_id: string;
  title: string;
  upload_kind: UploadKind;
  files: File[];
  content_hash?: string;
  onFileProgress?: (fileIndex: number, pct: number) => void;
}): Promise<string> {
  loadStoredToken();
  const init = await initVaultUpload({
    course_id: input.course_id,
    title: input.title,
    upload_kind: input.upload_kind,
    content_hash: input.content_hash,
    files: input.files.map((f) => ({
      file_name: f.name,
      content_mime: f.type || 'application/octet-stream',
      file_size_bytes: f.size,
    })),
  });

  for (let i = 0; i < input.files.length; i++) {
    const file = input.files[i]!;
    const signed = init.files[i]!;
    await uploadToSignedUrl(
      signed.signed_url,
      file,
      signed.content_mime,
      (pct) => input.onFileProgress?.(i, pct),
    );
  }

  await completeVaultUpload(init.upload_id);
  return init.upload_id;
}

export { API_BASE };
