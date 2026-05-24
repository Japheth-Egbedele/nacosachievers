import { subDays } from 'date-fns';
import { getSupabase } from '../config/supabase.js';
import { logger } from '../config/logger.js';

/**
 * Deletes read notifications older than 90 days.
 */
export async function cleanupOldNotifications(): Promise<void> {
  const cutoff = subDays(new Date(), 90).toISOString();
  const { data, error } = await getSupabase()
    .from('notifications')
    .delete()
    .eq('is_read', true)
    .lt('created_at', cutoff)
    .select('id');

  if (error) {
    logger.error({ err: error }, 'Notification cleanup failed');
    return;
  }
  logger.info({ count: data?.length ?? 0 }, 'Notification cleanup complete');
}
