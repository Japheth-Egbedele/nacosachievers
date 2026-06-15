import { v4 as uuidv4 } from 'uuid';
import { subHours } from 'date-fns';
import { getSupabase } from '../config/supabase.js';
import type { UploadKind, UploadStatus } from '../constants/enums.js';
import {
  VAULT_DEFAULT_BATCH_QUEUE_MAX,
  VAULT_DEFAULT_IMAGE_BYTES,
  VAULT_DEFAULT_MATERIAL_BYTES,
  VAULT_DRAFT_EXPIRY_HOURS,
} from '../constants/auth.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors.js';
import { parsePagination, buildMeta } from '../utils/pagination.js';
import {
  assertImageMagic,
  assertMaterialMagic,
  VAULT_IMAGE_MIMES,
  VAULT_MATERIAL_MIMES,
} from '../utils/file-validation.js';
import * as storageService from './storage.service.js';
import * as walletService from './wallet.service.js';
import * as settingsService from './settings.service.js';
import * as notificationService from './notification.service.js';

const BUCKET = 'vault-documents' as const;
const MAX_PAST_QUESTION_IMAGES = 20;

interface UploadFileRow {
  id: string;
  file_url: string;
  file_name: string;
  file_size_bytes: number;
  content_mime: string;
  sort_order: number;
}

async function getUploadLimitsFromSettings() {
  const [maxMaterial, maxImage, batchMax, defaultReward] = await Promise.all([
    settingsService.getSettingNumber('vault_max_material_bytes', VAULT_DEFAULT_MATERIAL_BYTES),
    settingsService.getSettingNumber('vault_max_image_bytes', VAULT_DEFAULT_IMAGE_BYTES),
    settingsService.getSettingNumber('vault_batch_queue_max', VAULT_DEFAULT_BATCH_QUEUE_MAX),
    settingsService.getSettingNumber('vault_upload_credit_reward', 10),
  ]);
  return {
    max_material_bytes: maxMaterial,
    max_image_bytes: maxImage,
    batch_queue_max: batchMax,
    default_credit_reward: defaultReward,
  };
}

export async function getUploadLimits() {
  return getUploadLimitsFromSettings();
}

async function attachCourseCounts<T extends { id: string }>(courses: T[]) {
  if (!courses.length) return courses.map((c) => ({ ...c, past_question_count: 0, course_material_count: 0 }));

  const ids = courses.map((c) => c.id);
  const { data: counts } = await getSupabase()
    .from('vault_uploads')
    .select('course_id, upload_kind')
    .eq('status', 'approved')
    .in('course_id', ids);

  const map = new Map<string, { past_question_count: number; course_material_count: number }>();
  for (const id of ids) {
    map.set(id, { past_question_count: 0, course_material_count: 0 });
  }
  for (const row of counts ?? []) {
    const entry = map.get(row.course_id);
    if (!entry) continue;
    if (row.upload_kind === 'past_question') entry.past_question_count += 1;
    else entry.course_material_count += 1;
  }

  return courses.map((c) => ({ ...c, ...map.get(c.id)! }));
}

/**
 * Lists vault courses with filters and per-kind upload counts.
 */
export async function listCourses(query: Record<string, unknown>) {
  const { page, limit, offset } = parsePagination(query);
  let q = getSupabase().from('vault_courses').select(
    'id, department_id, level, semester, course_code, course_name, units, created_at',
    { count: 'exact' },
  );

  if (query.department_id) q = q.eq('department_id', String(query.department_id));
  if (query.level) q = q.eq('level', String(query.level));
  if (query.semester) q = q.eq('semester', String(query.semester));
  if (query.search) {
    const s = String(query.search);
    q = q.or(`course_code.ilike.%${s}%,course_name.ilike.%${s}%`);
  }

  const { data, count, error } = await q
    .order('course_code')
    .range(offset, offset + limit - 1);
  if (error) throw error;

  const items = await attachCourseCounts(data ?? []);
  return { items, meta: buildMeta(count ?? 0, page, limit) };
}

export async function createCourse(input: Record<string, unknown>, createdBy: string) {
  const { data, error } = await getSupabase()
    .from('vault_courses')
    .insert({ ...input, created_by: createdBy })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCourse(id: string, input: Record<string, unknown>) {
  const { data, error } = await getSupabase()
    .from('vault_courses')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error || !data) throw new NotFoundError('Course not found');
  return data;
}

export async function deleteCourse(id: string): Promise<void> {
  const { error } = await getSupabase().from('vault_courses').delete().eq('id', id);
  if (error) throw error;
}

async function loadUploadFiles(uploadIds: string[]): Promise<Map<string, UploadFileRow[]>> {
  const map = new Map<string, UploadFileRow[]>();
  if (!uploadIds.length) return map;

  const { data } = await getSupabase()
    .from('vault_upload_files')
    .select('id, upload_id, file_url, file_name, file_size_bytes, content_mime, sort_order')
    .in('upload_id', uploadIds)
    .order('sort_order');

  for (const row of data ?? []) {
    const list = map.get(row.upload_id) ?? [];
    list.push(row);
    map.set(row.upload_id, list);
  }
  return map;
}

function enrichUpload<T extends { id: string; file_url?: string | null }>(
  upload: T,
  filesMap: Map<string, UploadFileRow[]>,
) {
  const files = filesMap.get(upload.id) ?? [];
  const pageCount = files.length || (upload.file_url ? 1 : 0);
  return { ...upload, files, page_count: pageCount };
}

export async function getCourseDetail(courseId: string, sessionId?: string) {
  const { data: course, error } = await getSupabase()
    .from('vault_courses')
    .select('*')
    .eq('id', courseId)
    .maybeSingle();
  if (error || !course) throw new NotFoundError('Course not found');

  let assignmentsQuery = getSupabase()
    .from('course_teaching_assignments')
    .select(
      'id, semester, teaching_status, session_id, lecturers(id, name, title, employment_type, photo_url)',
    )
    .eq('course_id', courseId);
  if (sessionId) assignmentsQuery = assignmentsQuery.eq('session_id', sessionId);

  const { data: assignments } = await assignmentsQuery;

  const { data: uploads } = await getSupabase()
    .from('vault_uploads')
    .select('id, title, upload_kind, download_count, created_at, file_url')
    .eq('course_id', courseId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  const uploadList = uploads ?? [];
  const filesMap = await loadUploadFiles(uploadList.map((u) => u.id));
  const enriched = uploadList.map((u) => enrichUpload(u, filesMap));

  return {
    course,
    lecturers: assignments ?? [],
    past_questions: enriched.filter((u) => u.upload_kind === 'past_question'),
    course_materials: enriched.filter((u) => u.upload_kind === 'course_material'),
    uploads: enriched,
  };
}

function validateInitFiles(
  uploadKind: UploadKind,
  files: { file_name: string; content_mime: string; file_size_bytes: number }[],
  limits: { max_material_bytes: number; max_image_bytes: number },
) {
  if (!files.length) throw new ValidationError('At least one file required');

  if (uploadKind === 'course_material') {
    if (files.length !== 1) throw new ValidationError('Course materials require exactly one file');
    const f = files[0]!;
    if (!VAULT_MATERIAL_MIMES.includes(f.content_mime as (typeof VAULT_MATERIAL_MIMES)[number])) {
      throw new ValidationError('Course material must be PDF, DOC, or DOCX');
    }
    if (f.file_size_bytes > limits.max_material_bytes) {
      throw new ValidationError(`File exceeds ${limits.max_material_bytes} byte limit`);
    }
    return;
  }

  const isPdfOnly = files.length === 1 && files[0]!.content_mime === 'application/pdf';
  if (isPdfOnly) {
    if (files[0]!.file_size_bytes > limits.max_material_bytes) {
      throw new ValidationError(`PDF exceeds ${limits.max_material_bytes} byte limit`);
    }
    return;
  }

  if (files.length > MAX_PAST_QUESTION_IMAGES) {
    throw new ValidationError(`Past questions allow at most ${MAX_PAST_QUESTION_IMAGES} images`);
  }
  for (const f of files) {
    if (!VAULT_IMAGE_MIMES.includes(f.content_mime as (typeof VAULT_IMAGE_MIMES)[number])) {
      throw new ValidationError('Past question images must be JPEG, PNG, or WebP (or upload one PDF)');
    }
    if (f.file_size_bytes > limits.max_image_bytes) {
      throw new ValidationError(`Image ${f.file_name} exceeds size limit after compression`);
    }
  }
}

export async function initUpload(input: {
  uploaderId: string;
  courseId: string;
  title: string;
  description?: string;
  uploadKind: UploadKind;
  contentHash?: string;
  files: { file_name: string; content_mime: string; file_size_bytes: number }[];
}) {
  await sweepExpiredDrafts();

  const limits = await getUploadLimitsFromSettings();
  validateInitFiles(input.uploadKind, input.files, limits);

  const totalSize = input.files.reduce((s, f) => s + f.file_size_bytes, 0);
  const primary = input.files[0]!;

  const { data: upload, error: uploadErr } = await getSupabase()
    .from('vault_uploads')
    .insert({
      uploader_id: input.uploaderId,
      course_id: input.courseId,
      title: input.title,
      description: input.description ?? null,
      upload_kind: input.uploadKind,
      status: 'draft',
      content_hash: input.contentHash ?? null,
      file_url: input.files.length === 1 ? 'pending' : null,
      file_name: input.files.length === 1 ? primary.file_name : null,
      file_size_bytes: input.files.length === 1 ? primary.file_size_bytes : totalSize,
    })
    .select()
    .single();
  if (uploadErr || !upload) throw uploadErr ?? new ValidationError('Failed to create upload draft');

  const signedFiles: {
    file_id: string;
    file_name: string;
    content_mime: string;
    signed_url: string;
    token: string;
    storage_path: string;
    sort_order: number;
  }[] = [];

  for (let i = 0; i < input.files.length; i++) {
    const f = input.files[i]!;
    const path = `${input.uploaderId}/${upload.id}/${uuidv4()}-${f.file_name}`;
    const signed = await storageService.createSignedUploadUrl(BUCKET, path);

    const { data: fileRow, error: fileErr } = await getSupabase()
      .from('vault_upload_files')
      .insert({
        upload_id: upload.id,
        file_url: path,
        file_name: f.file_name,
        file_size_bytes: f.file_size_bytes,
        content_mime: f.content_mime,
        sort_order: i,
      })
      .select()
      .single();
    if (fileErr || !fileRow) throw fileErr ?? new ValidationError('Failed to register file');

    signedFiles.push({
      file_id: fileRow.id,
      file_name: f.file_name,
      content_mime: f.content_mime,
      signed_url: signed.signedUrl,
      token: signed.token,
      storage_path: path,
      sort_order: i,
    });
  }

  return { upload_id: upload.id, files: signedFiles };
}

async function validateStoredFile(contentMime: string, path: string) {
  const buf = await storageService.downloadFile(BUCKET, path);
  if (VAULT_IMAGE_MIMES.includes(contentMime as (typeof VAULT_IMAGE_MIMES)[number])) {
    assertImageMagic(buf);
  } else {
    assertMaterialMagic(buf, contentMime);
  }
  return buf.length;
}

export async function completeUpload(input: {
  uploadId: string;
  uploaderId: string;
}) {
  const { data: upload } = await getSupabase()
    .from('vault_uploads')
    .select('*')
    .eq('id', input.uploadId)
    .maybeSingle();
  if (!upload) throw new NotFoundError('Upload not found');
  if (upload.uploader_id !== input.uploaderId) throw new ForbiddenError();
  if (upload.status !== 'draft') throw new ValidationError('Upload is not in draft state');

  const { data: files } = await getSupabase()
    .from('vault_upload_files')
    .select('*')
    .eq('upload_id', input.uploadId)
    .order('sort_order');
  if (!files?.length) {
    await failUploadDraft(input.uploadId);
    throw new ValidationError('No files registered for upload');
  }

  try {
    let totalBytes = 0;
    for (const file of files) {
      const exists = await storageService.objectExists(BUCKET, file.file_url);
      if (!exists) throw new ValidationError(`File not uploaded: ${file.file_name}`);
      const actualSize = await validateStoredFile(file.content_mime, file.file_url);
      totalBytes += actualSize;
      if (actualSize !== file.file_size_bytes) {
        await getSupabase()
          .from('vault_upload_files')
          .update({ file_size_bytes: actualSize })
          .eq('id', file.id);
      }
    }

    const primary = files[0]!;
    await getSupabase()
      .from('vault_uploads')
      .update({
        status: 'pending',
        file_url: primary.file_url,
        file_name: files.length === 1 ? primary.file_name : `${upload.title} (${files.length} pages)`,
        file_size_bytes: totalBytes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.uploadId);

    const { data: updated } = await getSupabase()
      .from('vault_uploads')
      .select('*')
      .eq('id', input.uploadId)
      .single();
    return updated;
  } catch (err) {
    await failUploadDraft(input.uploadId);
    throw err;
  }
}

async function failUploadDraft(uploadId: string) {
  await deleteUploadStorage(uploadId);
  await getSupabase()
    .from('vault_uploads')
    .update({ status: 'failed', updated_at: new Date().toISOString() })
    .eq('id', uploadId);
}

export async function deleteUploadStorage(uploadId: string): Promise<void> {
  const { data: upload } = await getSupabase()
    .from('vault_uploads')
    .select('file_url')
    .eq('id', uploadId)
    .maybeSingle();

  const { data: files } = await getSupabase()
    .from('vault_upload_files')
    .select('file_url')
    .eq('upload_id', uploadId);

  const paths = new Set<string>();
  if (upload?.file_url && upload.file_url !== 'pending') paths.add(upload.file_url);
  for (const f of files ?? []) paths.add(f.file_url);

  await Promise.all(
    [...paths].map((p) => storageService.deleteFile(BUCKET, p).catch(() => undefined)),
  );
}

export async function sweepExpiredDrafts(): Promise<void> {
  const cutoff = subHours(new Date(), VAULT_DRAFT_EXPIRY_HOURS).toISOString();
  const { data: drafts } = await getSupabase()
    .from('vault_uploads')
    .select('id')
    .eq('status', 'draft')
    .lt('created_at', cutoff);

  for (const d of drafts ?? []) {
    await deleteUploadStorage(d.id);
    await getSupabase().from('vault_upload_files').delete().eq('upload_id', d.id);
    await getSupabase().from('vault_uploads').delete().eq('id', d.id);
  }
}

export async function checkDuplicate(input: {
  courseId: string;
  uploadKind: UploadKind;
  fileName?: string;
  contentHash?: string;
}) {
  let q = getSupabase()
    .from('vault_uploads')
    .select('id, title, file_name, status')
    .eq('course_id', input.courseId)
    .eq('upload_kind', input.uploadKind)
    .in('status', ['pending', 'approved']);

  if (input.contentHash) {
    q = q.eq('content_hash', input.contentHash);
  } else if (input.fileName) {
    q = q.ilike('file_name', input.fileName);
  } else {
    return { duplicate: false, matches: [] };
  }

  const { data } = await q.limit(5);
  return { duplicate: (data?.length ?? 0) > 0, matches: data ?? [] };
}

/** Legacy multipart PDF upload (kept for compatibility). */
export async function createUpload(input: {
  uploaderId: string;
  courseId: string;
  title: string;
  description?: string;
  file: Buffer;
  fileName: string;
  uploadKind?: UploadKind;
}) {
  const limits = await getUploadLimitsFromSettings();
  if (input.file.length > limits.max_material_bytes) {
    throw new ValidationError('File exceeds size limit');
  }
  assertMaterialMagic(input.file, 'application/pdf');
  const path = `${input.uploaderId}/${uuidv4()}-${input.fileName}`;
  await storageService.uploadPrivate(BUCKET, path, input.file, 'application/pdf');

  const { data, error } = await getSupabase()
    .from('vault_uploads')
    .insert({
      uploader_id: input.uploaderId,
      course_id: input.courseId,
      title: input.title,
      description: input.description ?? null,
      file_url: path,
      file_size_bytes: input.file.length,
      file_name: input.fileName,
      upload_kind: input.uploadKind ?? 'past_question',
      status: 'pending',
    })
    .select()
    .single();
  if (error) throw error;

  await getSupabase().from('vault_upload_files').insert({
    upload_id: data.id,
    file_url: path,
    file_name: input.fileName,
    file_size_bytes: input.file.length,
    content_mime: 'application/pdf',
    sort_order: 0,
  });

  return data;
}

export async function listApprovedUploads(query: Record<string, unknown>) {
  const { page, limit, offset } = parsePagination(query);
  let q = getSupabase()
    .from('vault_uploads')
    .select(
      'id, title, description, course_id, upload_kind, download_count, created_at, uploader_id, file_url',
      { count: 'exact' },
    )
    .eq('status', 'approved');

  if (query.course_id) q = q.eq('course_id', String(query.course_id));
  if (query.upload_kind) q = q.eq('upload_kind', String(query.upload_kind));

  const { data, count, error } = await q
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;

  const filesMap = await loadUploadFiles((data ?? []).map((u) => u.id));
  const items = (data ?? []).map((u) => enrichUpload(u, filesMap));
  return { items, meta: buildMeta(count ?? 0, page, limit) };
}

export async function listMyUploads(userId: string, query: Record<string, unknown>) {
  const { page, limit, offset } = parsePagination(query);
  const { data, count, error } = await getSupabase()
    .from('vault_uploads')
    .select('*', { count: 'exact' })
    .eq('uploader_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;

  const filesMap = await loadUploadFiles((data ?? []).map((u) => u.id));
  const items = (data ?? []).map((u) => enrichUpload(u, filesMap));
  return { items, meta: buildMeta(count ?? 0, page, limit) };
}

export async function getDownloadUrl(uploadId: string, fileId?: string) {
  const { data: upload } = await getSupabase()
    .from('vault_uploads')
    .select('id, file_url, status, download_count')
    .eq('id', uploadId)
    .maybeSingle();
  if (!upload || upload.status !== 'approved') {
    throw new NotFoundError('Upload not found');
  }

  let path = upload.file_url;
  if (fileId) {
    const { data: file } = await getSupabase()
      .from('vault_upload_files')
      .select('file_url')
      .eq('id', fileId)
      .eq('upload_id', uploadId)
      .maybeSingle();
    if (!file) throw new NotFoundError('File not found');
    path = file.file_url;
  } else {
    const { data: files } = await getSupabase()
      .from('vault_upload_files')
      .select('file_url')
      .eq('upload_id', uploadId)
      .order('sort_order')
      .limit(1);
    if (files?.[0]) path = files[0].file_url;
  }

  if (!path) throw new NotFoundError('File not found');

  await getSupabase()
    .from('vault_uploads')
    .update({ download_count: upload.download_count + 1 })
    .eq('id', uploadId);

  const signedUrl = await storageService.createSignedUrl(BUCKET, path);
  return { download_url: signedUrl };
}

export async function getUploadFilesSigned(uploadId: string) {
  const { data: upload } = await getSupabase()
    .from('vault_uploads')
    .select('id, status')
    .eq('id', uploadId)
    .maybeSingle();
  if (!upload || upload.status !== 'approved') throw new NotFoundError('Upload not found');

  const { data: files } = await getSupabase()
    .from('vault_upload_files')
    .select('id, file_name, content_mime, sort_order, file_url')
    .eq('upload_id', uploadId)
    .order('sort_order');

  const withUrls = await Promise.all(
    (files ?? []).map(async (f) => ({
      id: f.id,
      file_name: f.file_name,
      content_mime: f.content_mime,
      sort_order: f.sort_order,
      url: await storageService.createSignedUrl(BUCKET, f.file_url),
    })),
  );
  return withUrls;
}

export async function deleteUpload(uploadId: string, userId: string, isAdmin: boolean) {
  const { data: upload } = await getSupabase()
    .from('vault_uploads')
    .select('uploader_id, status')
    .eq('id', uploadId)
    .maybeSingle();
  if (!upload) throw new NotFoundError('Upload not found');
  if (!isAdmin && upload.uploader_id !== userId) {
    throw new ForbiddenError();
  }
  if (!isAdmin && !['pending', 'draft', 'failed'].includes(upload.status)) {
    throw new ForbiddenError('Only pending uploads can be deleted');
  }
  await deleteUploadStorage(uploadId);
  await getSupabase().from('vault_upload_files').delete().eq('upload_id', uploadId);
  await getSupabase().from('vault_uploads').delete().eq('id', uploadId);
}

export async function listPending() {
  const { data, error } = await getSupabase()
    .from('vault_uploads')
    .select('*, users!vault_uploads_uploader_id_fkey(display_name, matric_number)')
    .eq('status', 'pending')
    .order('created_at');
  if (error) throw error;

  const filesMap = await loadUploadFiles((data ?? []).map((u) => u.id));
  return (data ?? []).map((u) => enrichUpload(u, filesMap));
}

export async function reviewUpload(input: {
  uploadId: string;
  reviewerId: string;
  status: Extract<UploadStatus, 'approved' | 'rejected'>;
  rejectionReason?: string;
  creditAmount?: number;
}) {
  const { data: upload } = await getSupabase()
    .from('vault_uploads')
    .select('*')
    .eq('id', input.uploadId)
    .maybeSingle();
  if (!upload) throw new NotFoundError('Upload not found');

  if (input.status === 'rejected') {
    await deleteUploadStorage(input.uploadId);
  }

  await getSupabase()
    .from('vault_uploads')
    .update({
      status: input.status,
      reviewed_by: input.reviewerId,
      reviewed_at: new Date().toISOString(),
      rejection_reason: input.rejectionReason ?? null,
    })
    .eq('id', input.uploadId);

  if (input.status === 'approved' && !upload.credits_awarded) {
    const defaultReward = await settingsService.getSettingNumber('vault_upload_credit_reward', 10);
    const reward = input.creditAmount ?? defaultReward;

    if (reward > 0) {
      await walletService.treasuryPayout({
        memberId: upload.uploader_id,
        amount: reward,
        remark: `Vault upload approved: ${upload.title}`,
        referenceId: upload.id,
        actorId: input.reviewerId,
      });
    }

    await getSupabase()
      .from('vault_uploads')
      .update({
        credits_awarded: reward > 0,
        credits_awarded_amount: reward > 0 ? reward : null,
      })
      .eq('id', upload.id);

    await notificationService.createNotification({
      userId: upload.uploader_id,
      title: 'Upload approved',
      body:
        reward > 0
          ? `Your upload "${upload.title}" was approved. You earned ${reward} credits.`
          : `Your upload "${upload.title}" was approved.`,
      type: 'vault_approved',
      referenceId: upload.id,
    });
    if (reward > 0) {
      await notificationService.maybeSendEmail(
        upload.uploader_id,
        'email_on_vault',
        'Vault upload approved',
        `<p>Your upload was approved. You earned ${reward} credits.</p>`,
      );
    }
  } else if (input.status === 'rejected') {
    await getSupabase().from('vault_upload_files').delete().eq('upload_id', input.uploadId);
    await notificationService.createNotification({
      userId: upload.uploader_id,
      title: 'Upload rejected',
      body: input.rejectionReason ?? 'Your upload was rejected.',
      type: 'vault_rejected',
      referenceId: upload.id,
    });
  }
}

export async function flagUpload(uploadId: string, userId: string, reason: string) {
  await getSupabase().from('vault_flags').insert({
    upload_id: uploadId,
    flagged_by: userId,
    reason,
  });
  const { data: upload } = await getSupabase()
    .from('vault_uploads')
    .select('flag_count')
    .eq('id', uploadId)
    .single();
  await getSupabase()
    .from('vault_uploads')
    .update({ flag_count: (upload?.flag_count ?? 0) + 1 })
    .eq('id', uploadId);
}

export async function listFlags() {
  const { data } = await getSupabase()
    .from('vault_flags')
    .select('*, vault_uploads(title)')
    .eq('resolved', false)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function resolveFlag(flagId: string, resolverId: string) {
  await getSupabase()
    .from('vault_flags')
    .update({ resolved: true, resolved_by: resolverId })
    .eq('id', flagId);
}

// Lecturers
export async function listLecturers() {
  const { data } = await getSupabase().from('lecturers').select('*').eq('is_active', true);
  return data ?? [];
}

export async function createLecturer(input: Record<string, unknown>) {
  const { data, error } = await getSupabase().from('lecturers').insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateLecturer(id: string, input: Record<string, unknown>) {
  const { data, error } = await getSupabase()
    .from('lecturers')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error || !data) throw new NotFoundError('Lecturer not found');
  return data;
}

export async function deleteLecturer(id: string) {
  await getSupabase().from('lecturers').update({ is_active: false }).eq('id', id);
}

export async function createAssignment(courseId: string, input: Record<string, unknown>, createdBy: string) {
  const { data, error } = await getSupabase()
    .from('course_teaching_assignments')
    .insert({ ...input, course_id: courseId, created_by: createdBy })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAssignment(id: string, input: Record<string, unknown>) {
  const { data, error } = await getSupabase()
    .from('course_teaching_assignments')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error || !data) throw new NotFoundError('Assignment not found');
  return data;
}

export async function deleteAssignment(id: string) {
  await getSupabase().from('course_teaching_assignments').delete().eq('id', id);
}
