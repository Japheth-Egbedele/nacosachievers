import { getSupabase } from '../config/supabase.js';
import type { UserLevel } from '../constants/enums.js';
import { isNumericStudentLevel, nextLevel } from '../utils/academic-level.js';

export type PromotionPreviewRow = {
  id: string;
  matric_number: string;
  first_name: string;
  last_name: string;
  level: string | null;
  next_level: string | null;
  academic_status: string;
  action: 'promote' | 'skip';
  skip_reason?: string;
};

export type GraduatePreviewRow = {
  id: string;
  matric_number: string;
  first_name: string;
  last_name: string;
  level: string | null;
  role: string;
  action: 'graduate' | 'skip';
  skip_reason?: string;
};

export async function previewSessionPromotion() {
  const { data, error } = await getSupabase()
    .from('users')
    .select('id, matric_number, first_name, last_name, level, academic_status, role')
    .in('role', ['member', 'executive'])
    .eq('is_active', true);

  if (error) throw error;

  const rows: PromotionPreviewRow[] = (data ?? []).map((u) => {
    if (u.academic_status === 'suspended') {
      return {
        ...u,
        next_level: null,
        action: 'skip' as const,
        skip_reason: 'Suspended',
      };
    }
    if (!isNumericStudentLevel(u.level)) {
      return {
        ...u,
        next_level: null,
        action: 'skip' as const,
        skip_reason: 'No numeric level',
      };
    }
    const nl = nextLevel(u.level);
    if (!nl) {
      return {
        ...u,
        next_level: null,
        action: 'skip' as const,
        skip_reason: 'Already at 400',
      };
    }
    return { ...u, next_level: nl, action: 'promote' as const };
  });

  return {
    promote: rows.filter((r) => r.action === 'promote'),
    skip: rows.filter((r) => r.action === 'skip'),
  };
}

export async function applySessionPromotion(): Promise<{ updated: number }> {
  const preview = await previewSessionPromotion();
  let updated = 0;
  for (const row of preview.promote) {
    if (!row.next_level) continue;
    const { error } = await getSupabase()
      .from('users')
      .update({ level: row.next_level as UserLevel, updated_at: new Date().toISOString() })
      .eq('id', row.id);
    if (!error) updated += 1;
  }
  return { updated };
}

export async function previewGraduateCohort() {
  const year = new Date().getFullYear();
  const { data, error } = await getSupabase()
    .from('users')
    .select('id, matric_number, first_name, last_name, level, academic_status, role')
    .in('role', ['member', 'executive'])
    .eq('is_active', true)
    .eq('level', '400');

  if (error) throw error;

  const rows: GraduatePreviewRow[] = (data ?? []).map((u) => {
    if (u.academic_status !== 'active') {
      return { ...u, action: 'skip' as const, skip_reason: `Status: ${u.academic_status}` };
    }
    return { ...u, action: 'graduate' as const };
  });

  return { year, graduate: rows.filter((r) => r.action === 'graduate'), skip: rows.filter((r) => r.action === 'skip') };
}

export async function applyGraduateCohort(): Promise<{ updated: number; year: number }> {
  const { year, graduate } = await previewGraduateCohort();
  let updated = 0;
  for (const row of graduate) {
    const patch: Record<string, unknown> = {
      academic_status: 'alumni',
      actual_graduation_year: year,
      updated_at: new Date().toISOString(),
    };
    if (row.role === 'member') patch.role = 'alumni';
    const { error } = await getSupabase().from('users').update(patch).eq('id', row.id);
    if (!error) updated += 1;
  }
  return { updated, year };
}

export async function lookupUsers(search: string, limit = 20) {
  const s = `%${search.trim()}%`;
  if (!search.trim()) return [];

  const { data, error } = await getSupabase()
    .from('users')
    .select('id, matric_number, email, role, first_name, last_name, display_name, is_active')
    .eq('is_active', true)
    .in('role', ['member', 'alumni', 'executive', 'staff'])
    .or(
      `matric_number.ilike.${s},email.ilike.${s},first_name.ilike.${s},last_name.ilike.${s},display_name.ilike.${s}`,
    )
    .order('last_name', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}
