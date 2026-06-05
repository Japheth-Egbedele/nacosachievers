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

/** Branded From header once your domain is verified in Resend. */
export function resendFromAddress(): string {
  return `NACOS Achievers <${env.RESEND_FROM_EMAIL}>`;
}

export { env as emailEnv };
