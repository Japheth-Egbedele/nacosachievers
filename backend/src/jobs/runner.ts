import cron from 'node-cron';
import { logger } from '../config/logger.js';
import { runHealthPing } from './healthPing.js';
import { cleanupExpiredPins } from './cleanupPins.js';
import { cleanupOldNotifications } from './cleanupNotifications.js';
import { runExpireCareers } from './expireCareers.js';

/**
 * Registers and starts scheduled cron jobs.
 */
export function startJobs(): void {
  cron.schedule('*/10 * * * *', () => {
    void runHealthPing();
  });

  cron.schedule('0 0 * * *', () => {
    void cleanupExpiredPins();
  });

  cron.schedule('0 3 * * 0', () => {
    void cleanupOldNotifications();
  });

  cron.schedule('0 1 * * *', () => {
    void runExpireCareers();
  });

  logger.info('Cron jobs registered');
}
