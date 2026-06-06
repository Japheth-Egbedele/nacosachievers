import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { addDays, addHours } from 'date-fns';
import { getSupabase } from '../config/supabase.js';
import { BCRYPT_ROUNDS, REFRESH_TOKEN_EXPIRY_DAYS } from '../constants/auth.js';
import {
  EMAIL_VERIFY_EXPIRY_HOURS,
  PASSWORD_RESET_EXPIRY_HOURS,
} from '../constants/auth.js';
import { AuthError, ValidationError } from '../utils/errors.js';
import { ERROR_MESSAGES } from '../constants/messages.js';
import { generateSecureToken, sha256 } from '../utils/crypto.js';
import * as pinService from './pin.service.js';
import * as tokenService from './token.service.js';
import * as emailService from './email.service.js';
import type { UserRecord } from '../types/user.types.js';
import type { UserRole } from '../constants/enums.js';
import { expectedGraduationYear } from '../utils/academic-level.js';

const USER_COLUMNS =
  'id, matric_number, email, password_hash, role, first_name, last_name, display_name, bio, profile_photo_url, department_id, level, level_of_entry, year_of_admission, expected_graduation_year, actual_graduation_year, academic_status, admission_type, linkedin_url, github_url, other_social_links, email_visible, wallet_balance, is_email_verified, is_active, notification_prefs, last_login_at, created_at, updated_at';

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: { id: string; role: UserRole };
}

/**
 * Validates student or staff PIN and returns onboarding token.
 */
export async function validatePinAndIssueToken(input: {
  matricNumber?: string;
  staffEmail?: string;
  pin: string;
}): Promise<{
  onboardingToken: string;
  pin_preview: {
    level_of_entry: string | null;
    department_id: string | null;
    year_of_admission: number | null;
    is_staff: boolean;
  };
}> {
  const row = input.staffEmail
    ? await pinService.validatePinByStaffEmail(input.staffEmail, input.pin)
    : await pinService.validatePinByMatric(input.matricNumber!, input.pin);
  const isStaff = row.level_of_entry === 'staff' || Boolean(row.staff_email);
  return {
    onboardingToken: tokenService.signOnboardingToken(row.id),
    pin_preview: {
      level_of_entry: row.level_of_entry,
      department_id: row.department_id,
      year_of_admission: row.year_of_admission,
      is_staff: isStaff,
    },
  };
}

/**
 * Registers a new user after PIN validation.
 */
export async function registerUser(input: {
  onboardingToken: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  yearOfAdmission?: number;
}): Promise<{ userId: string; email_sent: boolean }> {
  const pinId = tokenService.verifyOnboardingToken(input.onboardingToken);
  const activePin = await pinService.getActivePinById(pinId);
  if (!activePin) {
    throw new AuthError(ERROR_MESSAGES.INVALID_CREDENTIALS);
  }

  const emailLower = input.email.toLowerCase();
  const isStaff = activePin.level_of_entry === 'staff' || Boolean(activePin.staff_email);

  if (isStaff && activePin.staff_email && emailLower !== activePin.staff_email) {
    throw new ValidationError(
      'Registration email must match the work email on your onboarding PIN',
    );
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  let yearOfAdmission: number | null = activePin.year_of_admission;
  if (!isStaff) {
    if (yearOfAdmission == null) {
      if (input.yearOfAdmission == null) {
        throw new ValidationError('Year of admission is required');
      }
      yearOfAdmission = input.yearOfAdmission;
    }
  }

  const expectedGrad =
    !isStaff && activePin.level_of_entry && yearOfAdmission != null
      ? expectedGraduationYear(activePin.level_of_entry, yearOfAdmission)
      : null;

  const { data: user, error } = await getSupabase()
    .from('users')
    .insert({
      matric_number: activePin.matric_number,
      email: emailLower,
      password_hash: passwordHash,
      first_name: input.firstName,
      last_name: input.lastName,
      display_name: input.displayName ?? `${input.firstName} ${input.lastName}`,
      department_id: activePin.department_id,
      level: activePin.level_of_entry ?? null,
      level_of_entry: activePin.level_of_entry ?? null,
      year_of_admission: yearOfAdmission,
      expected_graduation_year: expectedGrad,
      admission_type: activePin.admission_type ?? 'regular',
      role: isStaff ? 'staff' : 'member',
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new ValidationError('Email or matric number already registered');
    }
    throw error;
  }

  await pinService.markPinUsed(activePin.id);

  const emailSent = await issueVerificationEmail(user.id, emailLower);

  return { userId: user.id, email_sent: emailSent };
}

async function issueVerificationEmail(userId: string, email: string): Promise<boolean> {
  await getSupabase()
    .from('email_verifications')
    .update({ used_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('used_at', null);

  const verifyToken = tokenService.signActionToken(
    userId,
    'email_verify',
    `${EMAIL_VERIFY_EXPIRY_HOURS}h`,
  );
  const tokenHash = sha256(verifyToken);
  await getSupabase().from('email_verifications').insert({
    user_id: userId,
    token_hash: tokenHash,
    expires_at: addHours(new Date(), EMAIL_VERIFY_EXPIRY_HOURS).toISOString(),
  });

  try {
    await emailService.sendVerificationEmail(email, verifyToken);
    return true;
  } catch {
    return false;
  }
}

async function getUnverifiedUserByCredentials(
  email: string,
  password: string,
): Promise<UserRecord> {
  const { data: user } = await getSupabase()
    .from('users')
    .select(USER_COLUMNS)
    .eq('email', email.toLowerCase())
    .maybeSingle();

  if (!user) {
    throw new AuthError(ERROR_MESSAGES.INVALID_CREDENTIALS);
  }

  const record = user as UserRecord;
  const valid = await bcrypt.compare(password, record.password_hash);
  if (!valid) {
    throw new AuthError(ERROR_MESSAGES.INVALID_CREDENTIALS);
  }

  if (record.is_email_verified) {
    throw new ValidationError('Email is already verified. You can sign in.');
  }

  if (!record.is_active) {
    throw new AuthError(ERROR_MESSAGES.ACCOUNT_INACTIVE);
  }

  return record;
}

/**
 * Resends verification email for an unverified account.
 */
export async function resendVerificationEmail(
  email: string,
  password: string,
): Promise<{ email_sent: boolean }> {
  const user = await getUnverifiedUserByCredentials(email, password);
  const emailSent = await issueVerificationEmail(user.id, user.email);
  if (!emailSent) {
    throw new ValidationError(
      'Could not send email. Check Resend configuration or try again shortly.',
    );
  }
  return { email_sent: true };
}

/**
 * Updates email for an unverified account and sends a new verification link.
 */
export async function correctPendingEmail(input: {
  email: string;
  password: string;
  newEmail: string;
}): Promise<{ email_sent: boolean; email: string }> {
  const user = await getUnverifiedUserByCredentials(input.email, input.password);
  const newEmail = input.newEmail.toLowerCase();

  if (newEmail === user.email.toLowerCase()) {
    throw new ValidationError('New email must be different from the current one');
  }

  const { error } = await getSupabase()
    .from('users')
    .update({ email: newEmail, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  if (error) {
    if (error.code === '23505') {
      throw new ValidationError('That email is already registered');
    }
    throw error;
  }

  const emailSent = await issueVerificationEmail(user.id, newEmail);
  if (!emailSent) {
    throw new ValidationError(
      'Email updated but verification message could not be sent. Try resend shortly.',
    );
  }

  return { email_sent: true, email: newEmail };
}

/**
 * Verifies email with token and starts a session (safe: one-time signed token + DB row).
 * @param token Verification token from email link
 */
export async function verifyEmail(token: string): Promise<LoginResult> {
  const userId = tokenService.verifyActionToken(token, 'email_verify');
  const tokenHash = sha256(token);

  const { data: row } = await getSupabase()
    .from('email_verifications')
    .select('id, used_at, expires_at')
    .eq('user_id', userId)
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (!row || row.used_at || new Date(row.expires_at) < new Date()) {
    throw new AuthError('Invalid or expired verification token');
  }

  await getSupabase()
    .from('email_verifications')
    .update({ used_at: new Date().toISOString() })
    .eq('id', row.id);

  const { data: userRow } = await getSupabase()
    .from('users')
    .update({
      is_email_verified: true,
      last_login_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select(USER_COLUMNS)
    .single();

  if (!userRow) {
    throw new AuthError(ERROR_MESSAGES.INTERNAL, 'INTERNAL_ERROR');
  }

  const record = userRow as UserRecord;

  if (!record.is_active) {
    throw new AuthError(ERROR_MESSAGES.ACCOUNT_INACTIVE);
  }

  if (record.email) {
    await emailService.sendWelcomeEmail(
      record.email,
      record.display_name ?? 'Member',
    );
  }

  const accessToken = tokenService.signAccessToken(record.id, record.role);
  const refreshToken = await createRefreshToken(record.id);

  return {
    accessToken,
    refreshToken,
    user: { id: record.id, role: record.role },
  };
}

/**
 * Authenticates user and returns tokens.
 */
export async function login(email: string, password: string): Promise<LoginResult> {
  const { data: user } = await getSupabase()
    .from('users')
    .select(USER_COLUMNS)
    .eq('email', email.toLowerCase())
    .maybeSingle();

  if (!user) {
    throw new AuthError(ERROR_MESSAGES.INVALID_CREDENTIALS);
  }

  const record = user as UserRecord;
  const valid = await bcrypt.compare(password, record.password_hash);
  if (!valid) {
    throw new AuthError(ERROR_MESSAGES.INVALID_CREDENTIALS);
  }

  if (!record.is_email_verified) {
    throw new AuthError(ERROR_MESSAGES.EMAIL_NOT_VERIFIED, 'EMAIL_NOT_VERIFIED');
  }

  if (!record.is_active) {
    throw new AuthError(ERROR_MESSAGES.ACCOUNT_INACTIVE);
  }

  await getSupabase()
    .from('users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', record.id);

  const accessToken = tokenService.signAccessToken(record.id, record.role);
  const refreshToken = await createRefreshToken(record.id);

  return {
    accessToken,
    refreshToken,
    user: { id: record.id, role: record.role },
  };
}

/**
 * Creates and stores a refresh token.
 * @param userId User UUID
 */
export async function createRefreshToken(userId: string): Promise<string> {
  const raw = generateSecureToken(48);
  const tokenHash = sha256(raw);
  const familyId = uuidv4();
  const expiresAt = addDays(new Date(), REFRESH_TOKEN_EXPIRY_DAYS).toISOString();

  await getSupabase().from('refresh_tokens').insert({
    user_id: userId,
    token_hash: tokenHash,
    family_id: familyId,
    expires_at: expiresAt,
  });

  return raw;
}

/**
 * Rotates refresh token and returns new pair.
 * @param rawRefreshToken Cookie refresh token
 */
export async function refreshSession(rawRefreshToken: string): Promise<LoginResult> {
  const tokenHash = sha256(rawRefreshToken);

  const { data: stored } = await getSupabase()
    .from('refresh_tokens')
    .select('id, user_id, family_id, is_revoked, expires_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (
    !stored ||
    stored.is_revoked ||
    new Date(stored.expires_at) < new Date()
  ) {
    throw new AuthError(ERROR_MESSAGES.UNAUTHORIZED);
  }

  await getSupabase()
    .from('refresh_tokens')
    .update({ is_revoked: true })
    .eq('id', stored.id);

  const { data: user } = await getSupabase()
    .from('users')
    .select('id, role, is_active, is_email_verified')
    .eq('id', stored.user_id)
    .maybeSingle();

  if (!user?.is_active || !user.is_email_verified) {
    throw new AuthError(ERROR_MESSAGES.UNAUTHORIZED);
  }

  const accessToken = tokenService.signAccessToken(user.id, user.role);
  const refreshToken = await createRefreshToken(user.id);

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, role: user.role },
  };
}

/**
 * Revokes refresh token on logout.
 * @param rawRefreshToken Cookie token
 */
export async function logout(rawRefreshToken: string): Promise<void> {
  const tokenHash = sha256(rawRefreshToken);
  await getSupabase()
    .from('refresh_tokens')
    .update({ is_revoked: true })
    .eq('token_hash', tokenHash);
}

/**
 * Initiates password reset (always succeeds from caller perspective).
 * @param email User email
 */
export async function forgotPassword(email: string): Promise<void> {
  const { data: user } = await getSupabase()
    .from('users')
    .select('id, email')
    .eq('email', email.toLowerCase())
    .maybeSingle();

  if (!user) {
    return;
  }

  const resetToken = tokenService.signActionToken(
    user.id,
    'password_reset',
    `${PASSWORD_RESET_EXPIRY_HOURS}h`,
  );
  const tokenHash = sha256(resetToken);

  await getSupabase().from('password_resets').insert({
    user_id: user.id,
    token_hash: tokenHash,
    expires_at: addHours(new Date(), PASSWORD_RESET_EXPIRY_HOURS).toISOString(),
  });

  await emailService.sendPasswordResetEmail(user.email, resetToken);
}

/**
 * Resets password with token.
 */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const userId = tokenService.verifyActionToken(token, 'password_reset');
  const tokenHash = sha256(token);

  const { data: row } = await getSupabase()
    .from('password_resets')
    .select('id, used_at, expires_at')
    .eq('user_id', userId)
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (!row || row.used_at || new Date(row.expires_at) < new Date()) {
    throw new AuthError('Invalid or expired reset token');
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await getSupabase()
    .from('users')
    .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
    .eq('id', userId);

  await getSupabase()
    .from('password_resets')
    .update({ used_at: new Date().toISOString() })
    .eq('id', row.id);

  await getSupabase()
    .from('refresh_tokens')
    .update({ is_revoked: true })
    .eq('user_id', userId);
}
