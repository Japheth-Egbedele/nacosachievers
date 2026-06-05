import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import { REFRESH_COOKIE_NAME, REFRESH_TOKEN_EXPIRY_DAYS } from '../constants/auth.js';
import { HTTP_STATUS } from '../constants/http.js';
import { AuthError } from '../utils/errors.js';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../constants/messages.js';
import { sendSuccess } from '../utils/response.js';
import * as authService from '../services/auth.service.js';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  path: '/api/v1/auth',
};

/**
 * Sets refresh token httpOnly cookie on response.
 * @param res Express response
 * @param token Refresh token
 */
function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, REFRESH_COOKIE_OPTIONS);
}

/**
 * Clears refresh token cookie.
 * @param res Express response
 */
function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth' });
}

/**
 * POST /auth/validate-pin
 */
export async function validatePin(req: Request, res: Response): Promise<void> {
  const { matric_number, pin } = req.body as {
    matric_number: string;
    pin: string;
  };
  const result = await authService.validatePinAndIssueToken(matric_number, pin);
  sendSuccess(res, { onboarding_token: result.onboardingToken }, HTTP_STATUS.OK);
}

/**
 * POST /auth/register
 */
export async function register(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    onboarding_token: string;
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    display_name?: string;
  };
  const result = await authService.registerUser({
    onboardingToken: body.onboarding_token,
    email: body.email,
    password: body.password,
    firstName: body.first_name,
    lastName: body.last_name,
    displayName: body.display_name,
  });
  sendSuccess(res, result, HTTP_STATUS.CREATED, 'Registration successful. Check your email.');
}

/**
 * POST /auth/verify-email
 */
export async function verifyEmail(req: Request, res: Response): Promise<void> {
  const { token } = req.body as { token: string };
  const result = await authService.verifyEmail(token);
  setRefreshCookie(res, result.refreshToken);
  sendSuccess(
    res,
    {
      access_token: result.accessToken,
      user: result.user,
    },
    HTTP_STATUS.OK,
    SUCCESS_MESSAGES.EMAIL_VERIFIED,
  );
}

/**
 * POST /auth/resend-verification
 */
export async function resendVerification(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email: string; password: string };
  const result = await authService.resendVerificationEmail(email, password);
  sendSuccess(res, result, HTTP_STATUS.OK, SUCCESS_MESSAGES.VERIFICATION_SENT);
}

/**
 * POST /auth/correct-pending-email
 */
export async function correctPendingEmail(req: Request, res: Response): Promise<void> {
  const body = req.body as { email: string; password: string; new_email: string };
  const result = await authService.correctPendingEmail({
    email: body.email,
    password: body.password,
    newEmail: body.new_email,
  });
  sendSuccess(res, result, HTTP_STATUS.OK, SUCCESS_MESSAGES.VERIFICATION_SENT);
}

/**
 * POST /auth/login
 */
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email: string; password: string };
  const result = await authService.login(email, password);
  setRefreshCookie(res, result.refreshToken);
  sendSuccess(res, {
    access_token: result.accessToken,
    user: result.user,
  });
}

/**
 * POST /auth/refresh
 */
export async function refresh(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
  if (!token) {
    throw new AuthError(ERROR_MESSAGES.UNAUTHORIZED);
  }
  const result = await authService.refreshSession(token);
  setRefreshCookie(res, result.refreshToken);
  sendSuccess(res, {
    access_token: result.accessToken,
    user: result.user,
  });
}

/**
 * POST /auth/logout
 */
export async function logout(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
  if (token) {
    await authService.logout(token);
  }
  clearRefreshCookie(res);
  sendSuccess(res, null, HTTP_STATUS.OK, SUCCESS_MESSAGES.LOGOUT);
}

/**
 * POST /auth/forgot-password
 */
export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = req.body as { email: string };
  await authService.forgotPassword(email);
  sendSuccess(res, null, HTTP_STATUS.OK, SUCCESS_MESSAGES.PASSWORD_RESET_SENT);
}

/**
 * POST /auth/reset-password
 */
export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { token, password } = req.body as { token: string; password: string };
  await authService.resetPassword(token, password);
  sendSuccess(res, null, HTTP_STATUS.OK, 'Password updated successfully');
}
