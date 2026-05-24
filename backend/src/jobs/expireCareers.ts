import { logger } from '../config/logger.js';
import * as careerService from '../services/career.service.js';

/**
 * Marks verified career postings past expires_at as expired.
 */
export async function runExpireCareers(): Promise<void> {
  try {
    const count = await careerService.expireCareerPostings();
    logger.info({ count }, 'Career expiry job complete');
  } catch (err) {
    logger.error({ err }, 'Career expiry job failed');
  }
}
