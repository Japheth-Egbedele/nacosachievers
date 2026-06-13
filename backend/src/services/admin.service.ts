import { getOfficeByKey } from '../constants/executive-offices.js';
import type { AdminScope } from '../constants/admin-scopes.js';
import { getSupabase } from '../config/supabase.js';
import type { AcademicStatus, UserLevel, UserRole } from '../constants/enums.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors.js';
import { expectedGraduationYear, isNumericStudentLevel } from '../utils/academic-level.js';
import { parsePagination, buildMeta } from '../utils/pagination.js';
import {
  applyMemberScope,
  emptyLevelCounts,
  MEMBER_LEVEL_BUCKETS,
  normalizeMemberScope,
  type MemberScope,
} from '../utils/member-scope.js';
import * as settingsService from './settings.service.js';

const MEMBER_COLUMNS =
  'id, matric_number, email, role, first_name, last_name, display_name, level, level_of_entry, year_of_admission, expected_graduation_year, academic_status, is_active, wallet_balance, is_email_verified, can_issue_pins, created_at, last_login_at';

/**
 * Paginated member list for admin portal.
 */
export async function listMembers(query: {
  page?: unknown;
  limit?: unknown;
  search?: string;
  scope?: MemberScope | string;
  role?: UserRole;
  level?: UserLevel;
  status?: AcademicStatus;
  is_active?: boolean;
}) {
  const { page, limit, offset } = parsePagination(query);
  const scope = normalizeMemberScope(query.scope);
  let q = getSupabase().from('users').select(MEMBER_COLUMNS, { count: 'exact' });
  q = applyMemberScope(q, scope);

  if (query.role) q = q.eq('role', query.role);
  if (query.level) q = q.eq('level', query.level);
  if (query.status) q = q.eq('academic_status', query.status);
  if (query.is_active !== undefined) q = q.eq('is_active', query.is_active);
  if (query.search) {
    const s = `%${query.search}%`;
    q = q.or(
      `matric_number.ilike.${s},email.ilike.${s},first_name.ilike.${s},last_name.ilike.${s},display_name.ilike.${s}`,
    );
  }

  const { data, count, error } = await q
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return { items: data ?? [], meta: buildMeta(count ?? 0, page, limit) };
}

/**
 * Member counts grouped by level for a given scope.
 */
export async function getMemberStats(scopeInput?: MemberScope | string) {
  const scope = normalizeMemberScope(scopeInput);
  const sb = getSupabase();

  const countAtLevel = (level?: UserLevel) => {
    let q = sb.from('users').select('id', { count: 'exact', head: true });
    q = applyMemberScope(q, scope);
    if (level) q = q.eq('level', level);
    return q;
  };

  const [totalRes, ...levelRes] = await Promise.all([
    countAtLevel(),
    ...MEMBER_LEVEL_BUCKETS.map((level) => countAtLevel(level)),
  ]);

  const by_level = emptyLevelCounts();
  let levelSum = 0;
  for (let i = 0; i < MEMBER_LEVEL_BUCKETS.length; i++) {
    const level = MEMBER_LEVEL_BUCKETS[i]!;
    const count = levelRes[i]?.count ?? 0;
    by_level[level] = count;
    levelSum += count;
  }

  const total = totalRes.count ?? 0;
  const unassigned = Math.max(0, total - levelSum);

  return { scope, total, by_level, unassigned };
}

/**
 * Member detail with wallet balance.
 */
export async function getMemberDetail(memberId: string) {
  const { data, error } = await getSupabase()
    .from('users')
    .select(
      'id, matric_number, email, role, first_name, last_name, display_name, bio, profile_photo_url, department_id, level, level_of_entry, year_of_admission, expected_graduation_year, actual_graduation_year, academic_status, admission_type, linkedin_url, github_url, wallet_balance, is_email_verified, is_active, notification_prefs, last_login_at, created_at, updated_at',
    )
    .eq('id', memberId)
    .maybeSingle();
  if (error || !data) throw new NotFoundError('Member not found');
  return data;
}

/**
 * Updates member role or active status.
 */
export async function patchMember(
  memberId: string,
  actorRole: UserRole,
  patch: {
    role?: UserRole;
    is_active?: boolean;
    academic_status?: AcademicStatus;
    can_issue_pins?: boolean;
    level?: UserLevel;
    year_of_admission?: number;
    expected_graduation_year?: number;
    actual_graduation_year?: number;
    admin_scopes?: AdminScope[];
  },
) {
  const { data: existing } = await getSupabase()
    .from('users')
    .select('id, level_of_entry, year_of_admission, role')
    .eq('id', memberId)
    .maybeSingle();
  if (!existing) throw new NotFoundError('Member not found');

  const privilegedPatch =
    patch.role !== undefined ||
    patch.is_active !== undefined ||
    patch.academic_status !== undefined;
  if (privilegedPatch && actorRole !== 'super_admin') {
    throw new ForbiddenError('Only super admins can change role, active status, or academic status');
  }
  if (patch.role === 'super_admin' && actorRole !== 'super_admin') {
    throw new ForbiddenError('Only super admins can grant super admin role');
  }
  if (existing.role === 'super_admin' && actorRole !== 'super_admin') {
    throw new ForbiddenError('Only super admins can modify super admin accounts');
  }
  if (patch.is_active === false && existing.role === 'super_admin') {
    const { count } = await getSupabase()
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'super_admin')
      .eq('is_active', true);
    if ((count ?? 0) <= 1) {
      throw new ValidationError('Cannot deactivate the last active super admin');
    }
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.role !== undefined) update.role = patch.role;
  if (patch.is_active !== undefined) update.is_active = patch.is_active;
  if (patch.academic_status !== undefined) update.academic_status = patch.academic_status;
  if (patch.can_issue_pins !== undefined) update.can_issue_pins = patch.can_issue_pins;
  if (patch.level !== undefined) {
    if (existing.role === 'staff' && patch.level !== 'staff') {
      throw new ValidationError('Staff accounts must keep level staff');
    }
    if (existing.role !== 'staff' && patch.level === 'staff') {
      throw new ValidationError('Only staff accounts can use level staff');
    }
    update.level = patch.level;
    if (!existing.level_of_entry) {
      update.level_of_entry = patch.level;
    }
    if (
      isNumericStudentLevel(patch.level) &&
      existing.year_of_admission != null &&
      patch.expected_graduation_year === undefined
    ) {
      const grad = expectedGraduationYear(patch.level, existing.year_of_admission);
      if (grad != null) update.expected_graduation_year = grad;
    }
  }
  if (patch.year_of_admission !== undefined) update.year_of_admission = patch.year_of_admission;
  if (patch.expected_graduation_year !== undefined) {
    update.expected_graduation_year = patch.expected_graduation_year;
  }
  if (patch.actual_graduation_year !== undefined) {
    update.actual_graduation_year = patch.actual_graduation_year;
  }
  if (patch.admin_scopes !== undefined) update.admin_scopes = patch.admin_scopes;

  const { data, error } = await getSupabase()
    .from('users')
    .update(update)
    .eq('id', memberId)
    .select(MEMBER_COLUMNS)
    .single();
  if (error) throw error;
  return data;
}

/**
 * Overview analytics for admin dashboard.
 */
export async function getAnalytics() {
  const now = new Date().toISOString();

  const [
    { count: memberCount },
    { count: uploadCount },
    { data: creditRows },
    { count: activeSessions },
  ] = await Promise.all([
    getSupabase()
      .from('users')
      .select('id', { count: 'exact', head: true })
      .in('role', ['member', 'alumni', 'executive', 'staff']),
    getSupabase()
      .from('vault_uploads')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved'),
    getSupabase()
      .from('wallet_transactions')
      .select('amount')
      .in('type', ['upload_reward', 'career_submission_bounty', 'credit']),
    getSupabase()
      .from('refresh_tokens')
      .select('id', { count: 'exact', head: true })
      .eq('is_revoked', false)
      .gt('expires_at', now),
  ]);

  const creditsDistributed = (creditRows ?? []).reduce((sum, row) => sum + (row.amount ?? 0), 0);

  return {
    member_count: memberCount ?? 0,
    approved_upload_count: uploadCount ?? 0,
    credits_distributed: creditsDistributed,
    active_sessions: activeSessions ?? 0,
  };
}

/**
 * Assigns executive role for a session.
 */
export async function assignExecutive(input: {
  userId: string;
  sessionId?: string;
  roleTitle: string;
  officeKey?: string;
  assignedBy: string;
}) {
  const office = input.officeKey ? getOfficeByKey(input.officeKey) : undefined;
  const roleTitle = office?.title ?? input.roleTitle;
  const adminScopes = office?.defaultScopes ?? [];

  const { data: user } = await getSupabase()
    .from('users')
    .select('id, role')
    .eq('id', input.userId)
    .maybeSingle();
  if (!user) throw new NotFoundError('User not found');

  await getSupabase()
    .from('users')
    .update({
      role: 'executive',
      admin_scopes: adminScopes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.userId);

  const { data, error } = await getSupabase()
    .from('executive_assignments')
    .insert({
      user_id: input.userId,
      session_id: input.sessionId ?? null,
      role_title: roleTitle,
      office_key: input.officeKey ?? null,
      assigned_by: input.assignedBy,
      is_active: true,
    })
    .select('id, user_id, session_id, role_title, office_key, is_active, created_at')
    .single();
  if (error) throw error;
  return data;
}

/**
 * Revokes an executive assignment.
 */
export async function revokeExecutive(assignmentId: string): Promise<void> {
  const { data } = await getSupabase()
    .from('executive_assignments')
    .select('id, user_id')
    .eq('id', assignmentId)
    .maybeSingle();
  if (!data) throw new NotFoundError('Assignment not found');

  await getSupabase()
    .from('executive_assignments')
    .update({ is_active: false })
    .eq('id', assignmentId);

  const { count } = await getSupabase()
    .from('executive_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', data.user_id)
    .eq('is_active', true);

  if ((count ?? 0) === 0) {
    await getSupabase()
      .from('users')
      .update({
        role: 'member',
        admin_scopes: [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.user_id)
      .eq('role', 'executive');
  }
}

/**
 * Syncs admin_scopes on all active executives from their office_key assignment.
 */
export async function syncExecutiveScopes(): Promise<{ updated: number; skipped: number }> {
  const { data: assignments, error } = await getSupabase()
    .from('executive_assignments')
    .select('user_id, office_key')
    .eq('is_active', true);

  if (error) throw error;

  let updated = 0;
  let skipped = 0;

  for (const row of assignments ?? []) {
    if (!row.office_key) {
      skipped += 1;
      continue;
    }
    const office = getOfficeByKey(row.office_key);
    if (!office) {
      skipped += 1;
      continue;
    }
    const { error: updateError } = await getSupabase()
      .from('users')
      .update({
        admin_scopes: office.defaultScopes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.user_id)
      .eq('role', 'executive');
    if (!updateError) updated += 1;
    else skipped += 1;
  }

  return { updated, skipped };
}

/**
 * Lists active executive assignments.
 */
export async function listExecutives() {
  const { data, error } = await getSupabase()
    .from('executive_assignments')
    .select(
      'id, session_id, role_title, office_key, is_active, created_at, users!executive_assignments_user_id_fkey(id, first_name, last_name, display_name, email, matric_number)',
    )
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export const getSettings = settingsService.getAllSettings;
export const updateSettings = settingsService.updateSettings;
