import { getSupabase } from '../config/supabase.js';
import {
  SIGNED_URL_EXPIRY_SECONDS,
  SUPABASE_FREE_TIER_STORAGE_BYTES,
} from '../constants/auth.js';

export type StorageBucket =
  | 'vault-documents'
  | 'public-images'
  | 'yearbook-portraits'
  | 'yearbook-pdfs'
  | 'yearbook-assets';

const TRACKED_BUCKETS: StorageBucket[] = [
  'vault-documents',
  'public-images',
  'yearbook-portraits',
  'yearbook-pdfs',
  'yearbook-assets',
];

export interface BucketUsage {
  bucket: StorageBucket;
  bytes: number;
  object_count: number;
}

/**
 * Uploads a file to Supabase Storage.
 */
export async function uploadFile(
  bucket: StorageBucket,
  path: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const { error } = await getSupabase().storage.from(bucket).upload(path, buffer, {
    contentType,
    upsert: true,
  });
  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }
  const { data } = getSupabase().storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Uploads to a private bucket and returns the storage path (not a URL).
 */
export async function uploadPrivate(
  bucket: 'vault-documents' | 'yearbook-portraits' | 'yearbook-pdfs',
  path: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const { error } = await getSupabase().storage.from(bucket).upload(path, buffer, {
    contentType,
    upsert: true,
  });
  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }
  return path;
}

/**
 * Creates a signed URL for direct client upload (bypasses API memory).
 */
export async function createSignedUploadUrl(
  bucket: 'vault-documents' | 'yearbook-portraits' | 'yearbook-pdfs',
  path: string,
): Promise<{ signedUrl: string; token: string; path: string }> {
  const { data, error } = await getSupabase().storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data?.signedUrl) {
    throw new Error(`Failed to create signed upload URL: ${error?.message ?? 'unknown'}`);
  }
  return { signedUrl: data.signedUrl, token: data.token, path: data.path };
}

/**
 * Checks whether a storage object exists.
 */
export async function objectExists(bucket: StorageBucket, path: string): Promise<boolean> {
  const parts = path.split('/');
  const fileName = parts.pop() ?? path;
  const folder = parts.join('/');
  const { data, error } = await getSupabase().storage.from(bucket).list(folder, {
    search: fileName,
    limit: 1,
  });
  if (error) return false;
  return (data ?? []).some((item) => item.name === fileName);
}

/**
 * Downloads a file from storage as a buffer.
 */
export async function downloadFile(bucket: StorageBucket, path: string): Promise<Buffer> {
  const { data, error } = await getSupabase().storage.from(bucket).download(path);
  if (error || !data) {
    throw new Error(`Storage download failed: ${error?.message ?? 'unknown'}`);
  }
  return Buffer.from(await data.arrayBuffer());
}

/**
 * Returns public URL for object in a public bucket.
 */
export function getPublicUrl(bucket: StorageBucket, path: string): string {
  const { data } = getSupabase().storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Creates a signed URL for private bucket access.
 */
export async function createSignedUrl(
  bucket: StorageBucket,
  path: string,
  expiresIn = SIGNED_URL_EXPIRY_SECONDS,
): Promise<string> {
  const { data, error } = await getSupabase()
    .storage.from(bucket)
    .createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) {
    throw new Error('Failed to create signed URL');
  }
  return data.signedUrl;
}

/**
 * Removes a file from storage (ignores missing).
 */
export async function deleteFile(bucket: StorageBucket, path: string): Promise<void> {
  await getSupabase().storage.from(bucket).remove([path]);
}

/**
 * Recursively sums object sizes in a bucket prefix (admin storage dashboard).
 */
async function sumBucketPrefix(
  bucket: StorageBucket,
  prefix = '',
): Promise<{ bytes: number; count: number }> {
  const { data, error } = await getSupabase().storage.from(bucket).list(prefix, {
    limit: 1000,
  });
  if (error || !data) return { bytes: 0, count: 0 };

  let bytes = 0;
  let count = 0;
  for (const item of data) {
    const itemPath = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id === null) {
      const nested = await sumBucketPrefix(bucket, itemPath);
      bytes += nested.bytes;
      count += nested.count;
    } else {
      bytes += item.metadata?.size ?? 0;
      count += 1;
    }
  }
  return { bytes, count };
}

/**
 * Returns approximate storage usage across tracked buckets.
 */
export async function getStorageUsage(): Promise<{
  total_bytes: number;
  quota_bytes: number;
  percent_used: number;
  buckets: BucketUsage[];
}> {
  const buckets: BucketUsage[] = [];
  let total = 0;
  for (const bucket of TRACKED_BUCKETS) {
    const { bytes, count } = await sumBucketPrefix(bucket);
    buckets.push({ bucket, bytes, object_count: count });
    total += bytes;
  }
  const quota = SUPABASE_FREE_TIER_STORAGE_BYTES;
  return {
    total_bytes: total,
    quota_bytes: quota,
    percent_used: quota > 0 ? Math.round((total / quota) * 1000) / 10 : 0,
    buckets,
  };
}

/**
 * Extracts storage path from public URL or returns path as-is.
 */
export function extractPathFromUrl(urlOrPath: string, bucket: StorageBucket): string {
  if (!urlOrPath.includes('http')) {
    return urlOrPath;
  }
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = urlOrPath.indexOf(marker);
  if (idx === -1) {
    return urlOrPath.split('/').pop() ?? urlOrPath;
  }
  return urlOrPath.slice(idx + marker.length).split('?')[0] ?? urlOrPath;
}
