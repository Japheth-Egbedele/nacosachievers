import { getSupabase } from '../config/supabase.js';
import type { CareerPostingStatus, WorkMode } from '../constants/enums.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { parsePagination, buildMeta } from '../utils/pagination.js';
import * as walletService from './wallet.service.js';
import * as settingsService from './settings.service.js';
import * as notificationService from './notification.service.js';

/** Known disposable / throwaway email & signup domains for application_url host checks. */
export const DISPOSABLE_EMAIL_DOMAINS = [
  'mailinator.com',
  'guerrillamail.com',
  '10minutemail.com',
  'tempmail.com',
  'throwaway.email',
  'yopmail.com',
  'getnada.com',
  'sharklasers.com',
  'trashmail.com',
];

const PUBLIC_COLUMNS =
  'id, title, organization, description, application_url, location, work_mode, expires_at, verified_at, created_at';

function isListingVisible(row: { status: string; expires_at: string | null }): boolean {
  if (row.status !== 'verified') return false;
  if (!row.expires_at) return true;
  return new Date(row.expires_at) > new Date();
}

/**
 * Rejects application URLs whose host matches a disposable domain blocklist.
 */
export function assertApplicationUrlAllowed(applicationUrl: string): void {
  let host: string;
  try {
    host = new URL(applicationUrl).hostname.toLowerCase();
  } catch {
    throw new ValidationError('Invalid application URL');
  }
  const blocked = DISPOSABLE_EMAIL_DOMAINS.some(
    (d) => host === d || host.endsWith(`.${d}`),
  );
  if (blocked) {
    throw new ValidationError('Application URL domain is not allowed');
  }
}

export async function listPublicPostings(query: {
  page?: unknown;
  limit?: unknown;
  work_mode?: WorkMode;
  location?: string;
}) {
  const { page, limit, offset } = parsePagination(query);
  const now = new Date().toISOString();

  let q = getSupabase()
    .from('career_postings')
    .select(PUBLIC_COLUMNS, { count: 'exact' })
    .eq('status', 'verified')
    .or(`expires_at.is.null,expires_at.gt.${now}`);

  if (query.work_mode) q = q.eq('work_mode', query.work_mode);
  if (query.location) q = q.ilike('location', `%${query.location}%`);

  const { data, count, error } = await q
    .order('verified_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return { items: data ?? [], meta: buildMeta(count ?? 0, page, limit) };
}

export async function getPublicPosting(postingId: string) {
  const { data } = await getSupabase()
    .from('career_postings')
    .select(`${PUBLIC_COLUMNS}, status`)
    .eq('id', postingId)
    .maybeSingle();
  if (!data || !isListingVisible(data)) {
    throw new NotFoundError('Posting not found');
  }
  return data;
}

export async function submitPosting(
  submitterId: string,
  input: {
    title: string;
    organization: string;
    description: string;
    application_url: string;
    location?: string;
    work_mode: WorkMode;
    expires_at?: string;
  },
) {
  assertApplicationUrlAllowed(input.application_url);

  const { data, error } = await getSupabase()
    .from('career_postings')
    .insert({
      title: input.title,
      organization: input.organization,
      description: input.description,
      application_url: input.application_url,
      location: input.location ?? null,
      work_mode: input.work_mode,
      expires_at: input.expires_at ?? null,
      status: 'pending_verification',
      submitter_id: submitterId,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listMyPostings(
  submitterId: string,
  query: { page?: unknown; limit?: unknown },
) {
  const { page, limit, offset } = parsePagination(query);
  const { data, count, error } = await getSupabase()
    .from('career_postings')
    .select('*', { count: 'exact' })
    .eq('submitter_id', submitterId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return { items: data ?? [], meta: buildMeta(count ?? 0, page, limit) };
}

export async function listAdminPostings(query: {
  page?: unknown;
  limit?: unknown;
  status?: CareerPostingStatus;
}) {
  const { page, limit, offset } = parsePagination(query);
  let q = getSupabase().from('career_postings').select('*', { count: 'exact' });
  if (query.status) q = q.eq('status', query.status);

  const { data, count, error } = await q
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return { items: data ?? [], meta: buildMeta(count ?? 0, page, limit) };
}

export async function verifyPosting(
  postingId: string,
  verifierId: string,
  input: { status: 'verified' | 'rejected'; reason?: string },
) {
  const { data: posting } = await getSupabase()
    .from('career_postings')
    .select('*')
    .eq('id', postingId)
    .maybeSingle();
  if (!posting) throw new NotFoundError('Posting not found');

  const patch: Record<string, unknown> = {
    status: input.status,
    verifier_id: verifierId,
    verified_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    rejection_reason: input.status === 'rejected' ? (input.reason ?? null) : null,
  };

  const { data, error } = await getSupabase()
    .from('career_postings')
    .update(patch)
    .eq('id', postingId)
    .select()
    .single();
  if (error) throw error;

  if (input.status === 'verified' && posting.submitter_id && !posting.submitter_credited) {
    const bounty = await settingsService.getSettingNumber('career_submission_bounty_credits', 0);
    if (bounty > 0) {
      await walletService.creditUser({
        userId: posting.submitter_id,
        amount: bounty,
        type: 'career_submission_bounty',
        remark: `Career posting verified: ${posting.title}`,
        referenceId: posting.id,
        actorId: verifierId,
      });
      await getSupabase()
        .from('career_postings')
        .update({ submitter_credited: true })
        .eq('id', postingId);
    }

    await notificationService.createNotification({
      userId: posting.submitter_id,
      title: 'Internship posting verified',
      body: `Your posting "${posting.title}" was verified.${bounty > 0 ? ` You earned ${bounty} credits.` : ''}`,
      type: 'career_verified',
      referenceId: posting.id,
    });
    await notificationService.maybeSendEmail(
      posting.submitter_id,
      'email_on_credit',
      'Internship posting verified',
      `<p>Your internship posting was verified.${bounty > 0 ? ` You earned ${bounty} credits.` : ''}</p>`,
    );
  }

  if (input.status === 'rejected' && posting.submitter_id) {
    await notificationService.createNotification({
      userId: posting.submitter_id,
      title: 'Internship posting rejected',
      body: input.reason ?? `Your posting "${posting.title}" was not approved.`,
      type: 'career_rejected',
      referenceId: posting.id,
    });
  }

  return data;
}

/**
 * Marks verified postings past expires_at as expired (cron).
 */
export async function expireCareerPostings(): Promise<number> {
  const now = new Date().toISOString();
  const { data, error } = await getSupabase()
    .from('career_postings')
    .update({ status: 'expired', updated_at: now })
    .eq('status', 'verified')
    .not('expires_at', 'is', null)
    .lte('expires_at', now)
    .select('id');
  if (error) throw error;
  return data?.length ?? 0;
}
