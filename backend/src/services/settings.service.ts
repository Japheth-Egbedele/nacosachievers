import { getSupabase } from '../config/supabase.js';

/**
 * Reads a site setting value as number.
 * @param key Setting key
 * @param defaultValue Fallback
 */
export async function getSettingNumber(key: string, defaultValue = 0): Promise<number> {
  const { data } = await getSupabase()
    .from('site_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (!data?.value) return defaultValue;
  const n = Number(data.value);
  return Number.isFinite(n) ? n : defaultValue;
}

/**
 * Reads all site settings as key-value map.
 */
export async function getAllSettings(): Promise<Record<string, unknown>> {
  const { data } = await getSupabase().from('site_settings').select('key, value');
  const out: Record<string, unknown> = {};
  for (const row of data ?? []) {
    out[row.key] = row.value;
  }
  return out;
}

/**
 * Updates site settings (super_admin).
 */
export async function updateSettings(
  updates: Record<string, unknown>,
  updatedBy: string,
): Promise<Record<string, unknown>> {
  for (const [key, value] of Object.entries(updates)) {
    await getSupabase()
      .from('site_settings')
      .upsert(
        {
          key,
          value,
          updated_by: updatedBy,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' },
      );
  }
  return getAllSettings();
}
