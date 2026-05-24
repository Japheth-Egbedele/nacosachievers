import { v4 as uuidv4 } from 'uuid';
import { getSupabase } from '../config/supabase.js';
import type { UploadKind, UploadStatus } from '../constants/enums.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
import { parsePagination, buildMeta } from '../utils/pagination.js';
import { assertPdfMagic } from '../utils/file-validation.js';
import * as storageService from './storage.service.js';
import * as walletService from './wallet.service.js';
import * as settingsService from './settings.service.js';
import * as notificationService from './notification.service.js';

/**
 * Lists vault courses with filters.
 */
export async function listCourses(query: Record<string, unknown>) {
  const { page, limit, offset } = parsePagination(query);
  let q = getSupabase().from('vault_courses').select(
    'id, department_id, level, semester, course_code, course_name, created_at',
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
  return { items: data ?? [], meta: buildMeta(count ?? 0, page, limit) };
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
    .select('id, title, upload_kind, download_count, created_at')
    .eq('course_id', courseId)
    .eq('status', 'approved');

  return { course, lecturers: assignments ?? [], uploads: uploads ?? [] };
}

export async function createUpload(input: {
  uploaderId: string;
  courseId: string;
  title: string;
  description?: string;
  file: Buffer;
  fileName: string;
  uploadKind?: UploadKind;
}) {
  assertPdfMagic(input.file);
  const path = `${input.uploaderId}/${uuidv4()}-${input.fileName}`;
  await storageService.uploadPrivate('vault-documents', path, input.file, 'application/pdf');

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
  return data;
}

export async function listApprovedUploads(query: Record<string, unknown>) {
  const { page, limit, offset } = parsePagination(query);
  let q = getSupabase()
    .from('vault_uploads')
    .select(
      'id, title, description, course_id, upload_kind, download_count, created_at, uploader_id',
      { count: 'exact' },
    )
    .eq('status', 'approved');

  if (query.course_id) q = q.eq('course_id', String(query.course_id));
  if (query.upload_kind) q = q.eq('upload_kind', String(query.upload_kind));

  const { data, count, error } = await q
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return { items: data ?? [], meta: buildMeta(count ?? 0, page, limit) };
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
  return { items: data ?? [], meta: buildMeta(count ?? 0, page, limit) };
}

export async function getDownloadUrl(uploadId: string) {
  const { data: upload } = await getSupabase()
    .from('vault_uploads')
    .select('id, file_url, status, download_count')
    .eq('id', uploadId)
    .maybeSingle();
  if (!upload || upload.status !== 'approved') {
    throw new NotFoundError('Upload not found');
  }

  await getSupabase()
    .from('vault_uploads')
    .update({ download_count: upload.download_count + 1 })
    .eq('id', uploadId);

  const signedUrl = await storageService.createSignedUrl('vault-documents', upload.file_url);
  return { download_url: signedUrl };
}

export async function deleteUpload(uploadId: string, userId: string, isAdmin: boolean) {
  const { data: upload } = await getSupabase()
    .from('vault_uploads')
    .select('uploader_id, file_url')
    .eq('id', uploadId)
    .maybeSingle();
  if (!upload) throw new NotFoundError('Upload not found');
  if (!isAdmin && upload.uploader_id !== userId) {
    throw new ForbiddenError();
  }
  await storageService.deleteFile('vault-documents', upload.file_url);
  await getSupabase().from('vault_uploads').delete().eq('id', uploadId);
}

export async function listPending() {
  const { data, error } = await getSupabase()
    .from('vault_uploads')
    .select('*, users!vault_uploads_uploader_id_fkey(display_name, matric_number)')
    .eq('status', 'pending')
    .order('created_at');
  if (error) throw error;
  return data ?? [];
}

export async function reviewUpload(input: {
  uploadId: string;
  reviewerId: string;
  status: Extract<UploadStatus, 'approved' | 'rejected'>;
  rejectionReason?: string;
}) {
  const { data: upload } = await getSupabase()
    .from('vault_uploads')
    .select('*')
    .eq('id', input.uploadId)
    .maybeSingle();
  if (!upload) throw new NotFoundError('Upload not found');

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
    const reward = await settingsService.getSettingNumber('vault_upload_credit_reward', 10);
    await walletService.creditUser({
      userId: upload.uploader_id,
      amount: reward,
      type: 'upload_reward',
      remark: `Vault upload approved: ${upload.title}`,
      referenceId: upload.id,
      actorId: input.reviewerId,
    });
    await getSupabase()
      .from('vault_uploads')
      .update({ credits_awarded: true })
      .eq('id', upload.id);

    await notificationService.createNotification({
      userId: upload.uploader_id,
      title: 'Upload approved',
      body: `Your upload "${upload.title}" was approved. You earned ${reward} credits.`,
      type: 'vault_approved',
      referenceId: upload.id,
    });
    await notificationService.maybeSendEmail(
      upload.uploader_id,
      'email_on_vault',
      'Vault upload approved',
      `<p>Your upload was approved. You earned ${reward} credits.</p>`,
    );
  } else if (input.status === 'rejected') {
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
