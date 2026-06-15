/** Formats bytes as human-readable size. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export type UploadKind = 'past_question' | 'course_material';

export interface UploadLimits {
  max_material_bytes: number;
  max_image_bytes: number;
  batch_queue_max: number;
  default_credit_reward: number;
}

const MATERIAL_ACCEPT =
  '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';

export function acceptForKind(kind: UploadKind): string {
  return kind === 'course_material' ? MATERIAL_ACCEPT : `${IMAGE_ACCEPT},application/pdf,.pdf`;
}

export function maxBytesForKind(kind: UploadKind, limits: UploadLimits, isImage: boolean): number {
  if (kind === 'course_material') return limits.max_material_bytes;
  return isImage ? limits.max_image_bytes : limits.max_material_bytes;
}

export function sizeWarningLevel(
  size: number,
  max: number,
): 'ok' | 'warn' | 'over' {
  if (size > max) return 'over';
  if (size > max * 0.8) return 'warn';
  return 'ok';
}

/** SHA-256 hex digest for duplicate detection. */
export async function hashFile(file: Blob): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
