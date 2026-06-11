import { getSupabase } from '../config/supabase.js';
import {
  DEFAULT_PIN_EXPIRY_HOURS,
  MAX_PIN_EXPIRY_HOURS,
  MIN_PIN_EXPIRY_HOURS,
} from '../constants/auth.js';
import { ValidationError } from '../utils/errors.js';

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

/** Onboarding PIN validity in hours (site_settings `pin_expiry_hours`, default 14 days). */
export async function getPinExpiryHours(): Promise<number> {
  const hours = await getSettingNumber('pin_expiry_hours', DEFAULT_PIN_EXPIRY_HOURS);
  return Math.min(MAX_PIN_EXPIRY_HOURS, Math.max(MIN_PIN_EXPIRY_HOURS, hours));
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
    if (key === 'pin_expiry_hours') {
      const hours = Number(value);
      if (!Number.isFinite(hours) || hours < MIN_PIN_EXPIRY_HOURS || hours > MAX_PIN_EXPIRY_HOURS) {
        throw new ValidationError(
          `pin_expiry_hours must be between ${MIN_PIN_EXPIRY_HOURS} and ${MAX_PIN_EXPIRY_HOURS}`,
        );
      }
    }
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
