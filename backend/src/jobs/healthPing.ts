import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

/**
 * Pings own /health endpoint to keep the host awake (e.g. Render free tier).
 */
export async function runHealthPing(): Promise<void> {
  const url = `http://127.0.0.1:${env.PORT}/health`;
  try {
    const headers: Record<string, string> = {};
    if (env.CRON_SECRET) {
      headers['x-cron-secret'] = env.CRON_SECRET;
    }
    const res = await fetch(url, { headers });
    if (!res.ok) {
      logger.warn({ status: res.status, url }, 'Health ping returned non-OK');
      return;
    }
    logger.debug({ url }, 'Health ping succeeded');
  } catch (err) {
    logger.error({ err, url }, 'Health ping failed');
  }
}
