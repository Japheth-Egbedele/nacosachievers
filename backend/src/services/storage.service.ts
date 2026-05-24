import { getSupabase } from '../config/supabase.js';
import { SIGNED_URL_EXPIRY_SECONDS } from '../constants/auth.js';

export type StorageBucket =
  | 'vault-documents'
  | 'public-images'
  | 'yearbook-portraits'
  | 'yearbook-pdfs'
  | 'yearbook-assets';

/**
 * Uploads a file to Supabase Storage.
 * @param bucket Bucket name
 * @param path Object path within bucket
 * @param buffer File data
 * @param contentType MIME type
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
 * @param bucket Public bucket
 * @param path Object path
 */
export function getPublicUrl(bucket: StorageBucket, path: string): string {
  const { data } = getSupabase().storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Creates a signed URL for private bucket access.
 * @param bucket Private bucket
 * @param path Object path
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
 * @param bucket Bucket name
 * @param path Object path
 */
export async function deleteFile(bucket: StorageBucket, path: string): Promise<void> {
  await getSupabase().storage.from(bucket).remove([path]);
}

/**
 * Extracts storage path from public URL or returns path as-is.
 * @param urlOrPath Full URL or path
 * @param bucket Bucket name segment
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
