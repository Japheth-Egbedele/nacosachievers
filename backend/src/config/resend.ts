import { Resend } from 'resend';
import { env } from './env.js';

let resend: Resend | null = null;

/**
 * Returns the Resend email client singleton.
 * @returns Resend client instance
 */
export function getResend(): Resend {
  if (!resend) {
    resend = new Resend(env.RESEND_API_KEY);
  }
  return resend;
}

export { env as emailEnv };
