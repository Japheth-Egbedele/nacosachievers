import { v4 as uuidv4 } from 'uuid';
import { getSupabase } from '../config/supabase.js';
import { NotFoundError, AuthError, ValidationError } from '../utils/errors.js';
import { assertImageMagic } from '../utils/file-validation.js';
import * as storageService from './storage.service.js';
import type { MeResponse, PublicUserProfile, UserRecord } from '../types/user.types.js';
import { parsePagination, buildMeta } from '../utils/pagination.js';
import bcrypt from 'bcrypt';
import { BCRYPT_ROUNDS } from '../constants/auth.js';
import { ERROR_MESSAGES } from '../constants/messages.js';

const USER_COLUMNS =
  'id, matric_number, email, password_hash, role, first_name, last_name, display_name, bio, profile_photo_url, department_id, level, level_of_entry, year_of_admission, expected_graduation_year, actual_graduation_year, academic_status, admission_type, linkedin_url, github_url, other_social_links, email_visible, wallet_balance, is_email_verified, is_active, can_issue_pins, notification_prefs, last_login_at, created_at, updated_at';

const PUBLIC_COLUMNS =
  'id, first_name, last_name, display_name, bio, profile_photo_url, role, level, expected_graduation_year, actual_graduation_year, linkedin_url, github_url, email_visible, email';

/**
 * Appends image optimization params for public CDN URLs.
 * @param url Image URL
 */
export function optimizeImageUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.includes('?')) return url;
  return `${url}?width=800&quality=80`;
}

/**
 * Loads authenticated user profile with badge counts.
 * @param userId User UUID
 */
export async function getMe(userId: string): Promise<MeResponse> {
  const { data, error } = await getSupabase()
    .from('users')
    .select(USER_COLUMNS)
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    throw new NotFoundError('User not found');
  }

  const user = data as UserRecord;

  const [{ count: unreadNotifications }, { count: unreadMessages }] = await Promise.all([
    getSupabase()
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false),
    getSupabase()
      .from('conversation_participants')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ]);

  return {
    id: user.id,
    matric_number: user.matric_number,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    display_name: user.display_name,
    bio: user.bio,
    profile_photo_url: optimizeImageUrl(user.profile_photo_url),
    role: user.role,
    level: user.level,
    expected_graduation_year: user.expected_graduation_year,
    actual_graduation_year: user.actual_graduation_year,
    linkedin_url: user.linkedin_url,
    github_url: user.github_url,
    email_visible: user.email_visible,
    wallet_balance: user.wallet_balance,
    is_email_verified: user.is_email_verified,
    can_issue_pins: Boolean((user as UserRecord & { can_issue_pins?: boolean }).can_issue_pins),
    academic_status: user.academic_status,
    admission_type: user.admission_type,
    year_of_admission: user.year_of_admission,
    notification_prefs: (user.notification_prefs as Record<string, unknown>) ?? {},
    unread_notifications_count: unreadNotifications ?? 0,
    unread_messages_count: unreadMessages ?? 0,
  };
}

/**
 * Updates own profile fields.
 */
export async function updateMe(
  userId: string,
  input: {
    display_name?: string;
    bio?: string;
    linkedin_url?: string | null;
    github_url?: string | null;
    email_visible?: boolean;
    notification_prefs?: Record<string, unknown>;
  },
): Promise<MeResponse> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.display_name !== undefined) patch.display_name = input.display_name;
  if (input.bio !== undefined) patch.bio = input.bio;
  if (input.linkedin_url !== undefined) patch.linkedin_url = input.linkedin_url;
  if (input.github_url !== undefined) patch.github_url = input.github_url;
  if (input.email_visible !== undefined) patch.email_visible = input.email_visible;
  if (input.notification_prefs !== undefined) patch.notification_prefs = input.notification_prefs;

  await getSupabase().from('users').update(patch).eq('id', userId);
  return getMe(userId);
}

/**
 * Changes password for authenticated user.
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const { data } = await getSupabase()
    .from('users')
    .select('password_hash')
    .eq('id', userId)
    .maybeSingle();

  if (!data) {
    throw new NotFoundError('User not found');
  }

  const valid = await bcrypt.compare(currentPassword, data.password_hash);
  if (!valid) {
    throw new AuthError(ERROR_MESSAGES.INVALID_CREDENTIALS);
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await getSupabase()
    .from('users')
    .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
    .eq('id', userId);
}

/**
 * Soft-deactivates the authenticated user's account.
 */
export async function deactivateSelf(userId: string, password: string): Promise<void> {
  const { data } = await getSupabase()
    .from('users')
    .select('password_hash, role')
    .eq('id', userId)
    .maybeSingle();

  if (!data) throw new NotFoundError('User not found');
  if (data.role === 'super_admin') {
    throw new ValidationError('Super admin accounts cannot be self-deleted');
  }

  const valid = await bcrypt.compare(password, data.password_hash);
  if (!valid) {
    throw new AuthError(ERROR_MESSAGES.INVALID_CREDENTIALS);
  }

  await getSupabase()
    .from('users')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', userId);

  await getSupabase()
    .from('refresh_tokens')
    .update({ is_revoked: true })
    .eq('user_id', userId)
    .eq('is_revoked', false);
}

/**
 * Public profile by user id.
 */
export async function getPublicProfile(userId: string): Promise<PublicUserProfile> {
  const { data } = await getSupabase()
    .from('users')
    .select(PUBLIC_COLUMNS)
    .eq('id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (!data) {
    throw new NotFoundError('Profile not found');
  }

  const profile: PublicUserProfile = {
    id: data.id,
    first_name: data.first_name,
    last_name: data.last_name,
    display_name: data.display_name,
    bio: data.bio,
    profile_photo_url: optimizeImageUrl(data.profile_photo_url),
    role: data.role,
    level: data.level,
    expected_graduation_year: data.expected_graduation_year,
    actual_graduation_year: data.actual_graduation_year,
    linkedin_url: data.linkedin_url,
    github_url: data.github_url,
  };

  if (data.email_visible) {
    profile.email = data.email;
  }

  return profile;
}

/**
 * Paginated alumni directory.
 */
export async function listAlumni(query: {
  page?: unknown;
  limit?: unknown;
  graduation_year?: unknown;
  level?: unknown;
}) {
  const { page, limit, offset } = parsePagination(query);
  let dbQuery = getSupabase()
    .from('users')
    .select(PUBLIC_COLUMNS, { count: 'exact' })
    .in('role', ['member', 'alumni'])
    .eq('is_active', true);

  if (query.graduation_year) {
    dbQuery = dbQuery.eq('actual_graduation_year', Number(query.graduation_year));
  }
  if (query.level) {
    dbQuery = dbQuery.eq('level', String(query.level));
  }

  const { data, count, error } = await dbQuery
    .order('last_name')
    .range(offset, offset + limit - 1);

  if (error) throw error;

  const items = (data ?? []).map((row) => ({
    ...row,
    profile_photo_url: optimizeImageUrl(row.profile_photo_url),
    email: row.email_visible ? row.email : undefined,
  }));

  return { items, meta: buildMeta(count ?? 0, page, limit) };
}

/**
 * Uploads profile photo to public-images bucket.
 */
export async function uploadProfilePhoto(
  userId: string,
  file: Buffer,
  mimeType: string,
  originalName: string,
): Promise<MeResponse> {
  assertImageMagic(file);
  const { data: user } = await getSupabase()
    .from('users')
    .select('profile_photo_url')
    .eq('id', userId)
    .maybeSingle();
  if (!user) throw new NotFoundError('User not found');

  if (user.profile_photo_url) {
    const oldPath = storageService.extractPathFromUrl(user.profile_photo_url, 'public-images');
    await storageService.deleteFile('public-images', oldPath).catch(() => undefined);
  }

  const ext = originalName.split('.').pop() ?? 'jpg';
  const path = `profiles/${userId}/${uuidv4()}.${ext}`;
  const publicUrl = await storageService.uploadFile('public-images', path, file, mimeType);

  await getSupabase()
    .from('users')
    .update({ profile_photo_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', userId);

  return getMe(userId);
}

/**
 * Removes profile photo from storage and user record.
 */
export async function deleteProfilePhoto(userId: string): Promise<MeResponse> {
  const { data: user } = await getSupabase()
    .from('users')
    .select('profile_photo_url')
    .eq('id', userId)
    .maybeSingle();
  if (!user) throw new NotFoundError('User not found');

  if (user.profile_photo_url) {
    const path = storageService.extractPathFromUrl(user.profile_photo_url, 'public-images');
    await storageService.deleteFile('public-images', path).catch(() => undefined);
  }

  await getSupabase()
    .from('users')
    .update({ profile_photo_url: null, updated_at: new Date().toISOString() })
    .eq('id', userId);

  return getMe(userId);
}

/**
 * Vault leaderboard top contributors.
 */
export async function getLeaderboard(limit = 10) {
  const { data, error } = await getSupabase()
    .from('users')
    .select('id, display_name, first_name, last_name, profile_photo_url, wallet_balance')
    .eq('is_active', true)
    .order('wallet_balance', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((u) => ({
    ...u,
    profile_photo_url: optimizeImageUrl(u.profile_photo_url),
  }));
}
