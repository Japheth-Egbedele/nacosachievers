import { getSupabase } from '../config/supabase.js';
import type { NotificationType } from '../constants/enums.js';
import { getResend, emailEnv } from '../config/resend.js';
import { logger } from '../config/logger.js';

/**
 * Creates an in-app notification for a user.
 */
export async function createNotification(input: {
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  referenceId?: string;
}): Promise<void> {
  await getSupabase().from('notifications').insert({
    user_id: input.userId,
    title: input.title,
    body: input.body,
    type: input.type,
    reference_id: input.referenceId ?? null,
  });
}

/**
 * Optionally sends email based on user prefs.
 */
export async function maybeSendEmail(
  userId: string,
  prefKey: string,
  subject: string,
  html: string,
): Promise<void> {
  const { data: user } = await getSupabase()
    .from('users')
    .select('email, notification_prefs')
    .eq('id', userId)
    .maybeSingle();
  if (!user?.email) return;

  const prefs = (user.notification_prefs as Record<string, boolean>) ?? {};
  if (prefs[prefKey] === false) return;

  try {
    await getResend().emails.send({
      from: emailEnv.RESEND_FROM_EMAIL,
      to: user.email,
      subject,
      html,
    });
  } catch (err) {
    logger.warn({ err, userId }, 'Notification email failed');
  }
}
