import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ACCESS_TOKEN_EXPIRY, ONBOARDING_TOKEN_EXPIRY } from '../constants/auth.js';
import type { UserRole } from '../constants/enums.js';
import type { JwtPayload, OnboardingTokenPayload } from '../types/user.types.js';
import { decodePemFromBase64 } from '../utils/crypto.js';

const privateKey = decodePemFromBase64(env.JWT_PRIVATE_KEY);
const publicKey = decodePemFromBase64(env.JWT_PUBLIC_KEY);

/**
 * Signs an access token for an authenticated user.
 * @param userId User UUID
 * @param role User role
 * @returns JWT access token
 */
export function signAccessToken(userId: string, role: UserRole): string {
  const payload: JwtPayload = { sub: userId, role };
  return jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

/**
 * Verifies and decodes an access token.
 * @param token JWT string
 * @returns Decoded payload
 */
export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as JwtPayload;
}

/**
 * Signs a short-lived onboarding token after PIN validation.
 * @param pinId Onboarding PIN row id
 */
export function signOnboardingToken(pinId: string): string {
  const payload: OnboardingTokenPayload = {
    sub: pinId,
    pin_id: pinId,
    type: 'onboarding',
  };
  return jwt.sign(payload, env.REFRESH_TOKEN_SECRET, {
    expiresIn: ONBOARDING_TOKEN_EXPIRY,
  });
}

/**
 * Verifies onboarding token from PIN step.
 * @param token Onboarding JWT
 * @returns PIN row id
 */
export function verifyOnboardingToken(token: string): string {
  const payload = jwt.verify(token, env.REFRESH_TOKEN_SECRET) as OnboardingTokenPayload;
  if (payload.type !== 'onboarding' || !payload.pin_id) {
    throw new Error('Invalid onboarding token');
  }
  return payload.pin_id;
}

/**
 * Signs a one-time email verification or password reset token (opaque to client).
 * @param userId User UUID
 * @param purpose Token purpose
 * @param expiresIn Expiry duration string
 */
export function signActionToken(
  userId: string,
  purpose: string,
  expiresIn: string,
): string {
  return jwt.sign({ sub: userId, purpose }, env.REFRESH_TOKEN_SECRET, {
    expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
  });
}

/**
 * Verifies action token and returns user id.
 * @param token JWT action token
 * @param purpose Expected purpose
 */
export function verifyActionToken(token: string, purpose: string): string {
  const payload = jwt.verify(token, env.REFRESH_TOKEN_SECRET) as {
    sub: string;
    purpose: string;
  };
  if (payload.purpose !== purpose) {
    throw new Error('Invalid token purpose');
  }
  return payload.sub;
}
