import { getResend, emailEnv, resendFromAddress } from '../config/resend.js';
import { logger } from '../config/logger.js';

/**
 * Sends email verification link to new user.
 * @param email Recipient email
 * @param token Verification token
 */
function verificationEmailHtml(link: string): string {
  return `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#18181b">
      <p style="color:#047857;font-weight:600">NACOS Achievers Chapter</p>
      <h1 style="font-size:1.25rem">Verify your email</h1>
      <p>Welcome to The Hub. Click the button below to activate your account.</p>
      <p style="margin:1.5rem 0">
        <a href="${link}" style="display:inline-block;background:#059669;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Verify email</a>
      </p>
      <p style="font-size:0.875rem;color:#71717a">If the button does not work, open this link:<br/><a href="${link}" style="color:#059669">${link}</a></p>
    </div>
  `;
}

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const link = `${emailEnv.FRONTEND_URL}/hub/verify-email?token=${encodeURIComponent(token)}`;
  try {
    await getResend().emails.send({
      from: resendFromAddress(),
      to: email,
      subject: 'Verify your NACOS account',
      html: verificationEmailHtml(link),
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
      from: resendFromAddress(),
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
      from: resendFromAddress(),
      to: email,
      subject: 'Welcome to NACOS Achievers',
      html: `<p>Hi ${displayName}, your account is active. Visit The Hub to get started.</p>`,
    });
  } catch (err) {
    logger.warn({ err, email }, 'Failed to send welcome email');
  }
}
