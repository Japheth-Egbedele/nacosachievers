import { v4 as uuidv4 } from 'uuid';
import { getSupabase } from '../config/supabase.js';
import type { YearbookEditionStatus } from '../constants/enums.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { assertImageMagic } from '../utils/file-validation.js';
import * as storageService from './storage.service.js';
import * as notificationService from './notification.service.js';
import * as yearbookPdfService from './yearbook-pdf.service.js';

function isPubliclyVisible(edition: {
  status: string;
  cohort_alumni_unlocked_at: string | null;
}): boolean {
  if (edition.status !== 'published') return false;
  if (!edition.cohort_alumni_unlocked_at) return false;
  return new Date(edition.cohort_alumni_unlocked_at) <= new Date();
}

/**
 * Edition open for member submissions.
 */
export async function getOpenEdition(editionId?: string) {
  let q = getSupabase()
    .from('yearbook_editions')
    .select('*')
    .eq('submissions_open', true)
    .neq('status', 'published');

  if (editionId) {
    q = q.eq('id', editionId);
  } else {
    q = q.order('created_at', { ascending: false }).limit(1);
  }

  const { data } = await q.maybeSingle();
  return data;
}

export async function listPublicEditions() {
  const now = new Date().toISOString();
  const { data, error } = await getSupabase()
    .from('yearbook_editions')
    .select(
      'id, title, session_id, status, cohort_alumni_unlocked_at, pdf_generated_at, pdf_build_status, created_at',
    )
    .eq('status', 'published')
    .lte('cohort_alumni_unlocked_at', now)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getPublicEdition(editionId: string) {
  const { data } = await getSupabase()
    .from('yearbook_editions')
    .select(
      'id, title, session_id, status, cohort_alumni_unlocked_at, pdf_generated_at, pdf_build_status, pdf_built_at_version, pdf_cache_version, created_at',
    )
    .eq('id', editionId)
    .maybeSingle();
  if (!data || !isPubliclyVisible(data)) {
    throw new NotFoundError('Edition not found');
  }
  return data;
}

export async function getEditionDownload(editionId: string) {
  const edition = await getPublicEdition(editionId);

  if (
    edition.pdf_cache_version > edition.pdf_built_at_version ||
    edition.pdf_build_status === 'none' ||
    edition.pdf_build_status === 'failed'
  ) {
    yearbookPdfService.queuePdfRebuild(editionId);
    return {
      status: 'building' as const,
      pdf_build_status: 'building',
    };
  }

  if (edition.pdf_build_status === 'building') {
    return { status: 'building' as const, pdf_build_status: 'building' };
  }

  const { data: full } = await getSupabase()
    .from('yearbook_editions')
    .select('pdf_storage_path, pdf_build_status')
    .eq('id', editionId)
    .single();

  if (!full?.pdf_storage_path) {
    yearbookPdfService.queuePdfRebuild(editionId);
    return { status: 'building' as const, pdf_build_status: 'building' };
  }

  const signedUrl = await storageService.createSignedUrl('yearbook-pdfs', full.pdf_storage_path);
  return {
    status: 'ready' as const,
    url: signedUrl,
    pdf_build_status: full.pdf_build_status,
  };
}

export async function listAdminEditions() {
  const { data, error } = await getSupabase()
    .from('yearbook_editions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createEdition(
  input: {
    title: string;
    session_id?: string;
    submissions_open?: boolean;
    cohort_alumni_unlocked_at?: string;
  },
  createdBy: string,
) {
  const { data, error } = await getSupabase()
    .from('yearbook_editions')
    .insert({
      title: input.title,
      session_id: input.session_id ?? null,
      submissions_open: input.submissions_open ?? true,
      cohort_alumni_unlocked_at: input.cohort_alumni_unlocked_at ?? null,
      created_by: createdBy,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateEdition(
  editionId: string,
  input: {
    title?: string;
    session_id?: string | null;
    submissions_open?: boolean;
    cohort_alumni_unlocked_at?: string | null;
    status?: YearbookEditionStatus;
  },
) {
  const { data: existing } = await getSupabase()
    .from('yearbook_editions')
    .select('id, status')
    .eq('id', editionId)
    .maybeSingle();
  if (!existing) throw new NotFoundError('Edition not found');

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.title !== undefined) patch.title = input.title;
  if (input.session_id !== undefined) patch.session_id = input.session_id;
  if (input.cohort_alumni_unlocked_at !== undefined) {
    patch.cohort_alumni_unlocked_at = input.cohort_alumni_unlocked_at;
  }

  const wasPublished = existing.status === 'published';

  if (input.status === 'published') {
    patch.status = 'published';
    patch.submissions_open = false;
  } else {
    if (input.submissions_open !== undefined) patch.submissions_open = input.submissions_open;
    if (input.status !== undefined) patch.status = input.status;
  }

  const { data, error } = await getSupabase()
    .from('yearbook_editions')
    .update(patch)
    .eq('id', editionId)
    .select()
    .single();
  if (error) throw error;

  if (input.status === 'published' && !wasPublished) {
    await notifyEditionPublished(editionId);
    yearbookPdfService.queuePdfRebuild(editionId);
  }

  return data;
}

async function notifyEditionPublished(editionId: string): Promise<void> {
  const { data: slots } = await getSupabase()
    .from('yearbook_slots')
    .select('user_id')
    .eq('edition_id', editionId);

  const userIds = [...new Set((slots ?? []).map((s) => s.user_id))];
  await Promise.all(
    userIds.map((userId) =>
      notificationService.createNotification({
        userId,
        title: 'Yearbook published',
        body: 'Your class yearbook edition is now available.',
        type: 'yearbook_published',
        referenceId: editionId,
      }),
    ),
  );
}

export async function listEditionSlots(editionId: string) {
  const { data, error } = await getSupabase()
    .from('yearbook_slots')
    .select(
      'id, edition_id, user_id, display_name, portrait_url, quote, include_in_yearbook, sort_key, admin_notes, updated_at, users!yearbook_slots_user_id_fkey(matric_number, first_name, last_name)',
    )
    .eq('edition_id', editionId)
    .order('sort_key')
    .order('display_name');
  if (error) throw error;
  return data ?? [];
}

export async function adminPatchSlot(
  editionId: string,
  userId: string,
  input: {
    display_name?: string;
    portrait_url?: string | null;
    quote?: string | null;
    include_in_yearbook?: boolean;
    sort_key?: number;
    admin_notes?: string | null;
  },
  editorId: string,
) {
  await ensureSlot(editionId, userId);
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    last_edited_by: editorId,
  };
  if (input.display_name !== undefined) patch.display_name = input.display_name;
  if (input.portrait_url !== undefined) patch.portrait_url = input.portrait_url;
  if (input.quote !== undefined) patch.quote = input.quote;
  if (input.include_in_yearbook !== undefined) patch.include_in_yearbook = input.include_in_yearbook;
  if (input.sort_key !== undefined) patch.sort_key = input.sort_key;
  if (input.admin_notes !== undefined) patch.admin_notes = input.admin_notes;

  const { data, error } = await getSupabase()
    .from('yearbook_slots')
    .update(patch)
    .eq('edition_id', editionId)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw error;

  await bumpPdfCacheVersion(editionId);
  return data;
}

async function bumpPdfCacheVersion(editionId: string): Promise<void> {
  const { data } = await getSupabase()
    .from('yearbook_editions')
    .select('pdf_cache_version')
    .eq('id', editionId)
    .single();
  const next = (data?.pdf_cache_version ?? 0) + 1;
  await getSupabase()
    .from('yearbook_editions')
    .update({
      pdf_cache_version: next,
      pdf_build_status: 'none',
      updated_at: new Date().toISOString(),
    })
    .eq('id', editionId);
  yearbookPdfService.queuePdfRebuild(editionId);
}

async function ensureSlot(editionId: string, userId: string): Promise<void> {
  const { data } = await getSupabase()
    .from('yearbook_slots')
    .select('id')
    .eq('edition_id', editionId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!data) {
    await getSupabase().from('yearbook_slots').insert({ edition_id: editionId, user_id: userId });
  }
}

export async function rebuildPdf(editionId: string): Promise<void> {
  const { data } = await getSupabase()
    .from('yearbook_editions')
    .select('id')
    .eq('id', editionId)
    .maybeSingle();
  if (!data) throw new NotFoundError('Edition not found');
  await bumpPdfCacheVersion(editionId);
}

export async function uploadPortrait(
  userId: string,
  file: Buffer,
  mimeType: string,
  originalName: string,
): Promise<{ portrait_url: string }> {
  assertImageMagic(file);
  const ext = originalName.split('.').pop() ?? 'jpg';
  const path = `${userId}/${uuidv4()}.${ext}`;
  await storageService.uploadPrivate('yearbook-portraits', path, file, mimeType);
  return { portrait_url: path };
}

export async function memberPatchYearbook(
  userId: string,
  input: {
    edition_id?: string;
    display_name?: string;
    portrait_url?: string;
    quote?: string;
  },
) {
  const edition = await getOpenEdition(input.edition_id);
  if (!edition) {
    throw new ValidationError('No open yearbook edition for submissions');
  }

  await ensureSlot(edition.id, userId);

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    last_edited_by: userId,
  };
  if (input.display_name !== undefined) patch.display_name = input.display_name;
  if (input.portrait_url !== undefined) patch.portrait_url = input.portrait_url;
  if (input.quote !== undefined) patch.quote = input.quote;

  const { data, error } = await getSupabase()
    .from('yearbook_slots')
    .update(patch)
    .eq('edition_id', edition.id)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw error;
  return { edition, slot: data };
}

export async function getMemberYearbookSlot(userId: string, editionId?: string) {
  const edition = editionId
    ? await getOpenEdition(editionId)
    : await getOpenEdition();
  if (!edition) return { edition: null, slot: null };

  const { data: slot } = await getSupabase()
    .from('yearbook_slots')
    .select('*')
    .eq('edition_id', edition.id)
    .eq('user_id', userId)
    .maybeSingle();

  let portraitSignedUrl: string | null = null;
  if (slot?.portrait_url) {
    const path = storageService.extractPathFromUrl(slot.portrait_url, 'yearbook-portraits');
    portraitSignedUrl = await storageService.createSignedUrl('yearbook-portraits', path, 3600);
  }

  return {
    edition,
    slot: slot ? { ...slot, portrait_signed_url: portraitSignedUrl } : null,
  };
}
