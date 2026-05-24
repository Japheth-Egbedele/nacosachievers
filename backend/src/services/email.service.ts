import { getResend, emailEnv } from '../config/resend.js';
import { logger } from '../config/logger.js';

/**
 * Sends email verification link to new user.
 * @param email Recipient email
 * @param token Verification token
 */
export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const link = `${emailEnv.FRONTEND_URL}/hub/verify-email?token=${encodeURIComponent(token)}`;
  try {
    await getResend().emails.send({
      from: emailEnv.RESEND_FROM_EMAIL,
      to: email,
      subject: 'Verify your NACOS account',
      html: `<p>Welcome to NACOS Achievers. <a href="${link}">Verify your email</a> to activate your account.</p>`,
    });
  } catch (err) {
    logger.error({ err, email }, 'Failed to send verification email');
    throw err;
  }
}

/**
 * Sends password reset link.
 * @param email Recipient email
 * @param token Reset token
 */
export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const link = `${emailEnv.FRONTEND_URL}/hub/reset-password?token=${encodeURIComponent(token)}`;
  try {
    await getResend().emails.send({
      from: emailEnv.RESEND_FROM_EMAIL,
      to: email,
      subject: 'Reset your NACOS password',
      html: `<p><a href="${link}">Reset your password</a>. This link expires in 1 hour.</p>`,
    });
  } catch (err) {
    logger.error({ err, email }, 'Failed to send password reset email');
    throw err;
  }
}

/**
 * Sends welcome email after verification.
 * @param email Recipient email
 * @param displayName User display name
 */
export async function sendWelcomeEmail(email: string, displayName: string): Promise<void> {
  try {
    await getResend().emails.send({
      from: emailEnv.RESEND_FROM_EMAIL,
      to: email,
      subject: 'Welcome to NACOS Achievers',
      html: `<p>Hi ${displayName}, your account is active. Visit The Hub to get started.</p>`,
    });
  } catch (err) {
    logger.warn({ err, email }, 'Failed to send welcome email');
  }
}
