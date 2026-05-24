import { getSupabase } from '../config/supabase.js';
import { NotFoundError } from '../utils/errors.js';
import { parsePagination, buildMeta } from '../utils/pagination.js';
import type { PaginationMeta } from '../utils/response.js';

export interface NotificationRow {
  id: string;
  title: string;
  body: string;
  type: string;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

/**
 * Lists notifications for a user (unread first).
 */
export async function listNotifications(
  userId: string,
  query: { page?: unknown; limit?: unknown },
): Promise<{ items: NotificationRow[]; meta: PaginationMeta }> {
  const { page, limit, offset } = parsePagination(query);

  const { data, count, error } = await getSupabase()
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('is_read', { ascending: true })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return {
    items: (data ?? []) as NotificationRow[],
    meta: buildMeta(count ?? 0, page, limit),
  };
}

/**
 * Marks a single notification as read.
 */
export async function markRead(userId: string, notificationId: string): Promise<void> {
  const { data } = await getSupabase()
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', userId)
    .select('id');

  if (!data?.length) throw new NotFoundError('Notification not found');
}

/**
 * Marks all notifications as read for a user.
 */
export async function markAllRead(userId: string): Promise<{ updated: number }> {
  const { data, error } = await getSupabase()
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)
    .select('id');

  if (error) throw error;
  return { updated: data?.length ?? 0 };
}
