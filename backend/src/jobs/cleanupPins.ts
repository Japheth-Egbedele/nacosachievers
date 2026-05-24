import { getSupabase } from '../config/supabase.js';
import { logger } from '../config/logger.js';

/**
 * Removes expired unused onboarding PINs.
 */
export async function cleanupExpiredPins(): Promise<void> {
  const now = new Date().toISOString();
  const { data, error } = await getSupabase()
    .from('onboarding_pins')
    .delete()
    .eq('is_used', false)
    .lt('expires_at', now)
    .select('id');

  if (error) {
    logger.error({ err: error }, 'PIN cleanup failed');
    return;
  }
  logger.info({ count: data?.length ?? 0 }, 'Expired PIN cleanup complete');
}
