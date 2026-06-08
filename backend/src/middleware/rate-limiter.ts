import type { Request } from 'express';
import rateLimit from 'express-rate-limit';
import { HTTP_STATUS } from '../constants/http.js';

type RateLimitResponse = {
  status: (code: number) => { json: (body: unknown) => void; setHeader?: (n: string, v: string) => void };
};

const jsonHandler = (_req: unknown, res: RateLimitResponse) => {
  res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
    success: false,
    error: 'Too many requests, please try again later',
    code: 'RATE_LIMIT',
  });
};

function clientIp(req: Request): string {
  return req.ip ?? 'unknown';
}

function bodyEmail(req: Request): string {
  const body = req.body as { email?: string; new_email?: string };
  return (body.email ?? body.new_email ?? 'unknown').trim().toLowerCase();
}

function validatePinKey(req: Request): string {
  const body = req.body as { matric_number?: string; staff_email?: string };
  const id =
    body.matric_number?.trim().toUpperCase() ??
    body.staff_email?.trim().toLowerCase() ??
    'unknown';
  return `${clientIp(req)}:${id}`;
}

function verifyEmailKey(req: Request): string {
  const body = req.body as { token?: string };
  const token = body.token?.trim();
  if (token && token.length >= 8) {
    return `${clientIp(req)}:${token.slice(0, 24)}`;
  }
  return clientIp(req);
}

/** Tight limit for password reset / forgot flows — per IP only. */
export const authRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler,
});

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler,
});

/** Step 1 onboarding — generous per matric/staff email; PIN lockout handles brute force. */
export const validatePinRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: validatePinKey,
  handler: jsonHandler,
});

/** Step 2 onboarding — per registered email. */
export const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${clientIp(req)}:${bodyEmail(req)}`,
  handler: jsonHandler,
});

export const verifyEmailRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: verifyEmailKey,
  handler: jsonHandler,
});

export const resendVerificationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 6,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${clientIp(req)}:${bodyEmail(req)}`,
  handler: jsonHandler,
});

export const correctPendingEmailRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 6,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${clientIp(req)}:${bodyEmail(req)}`,
  handler: jsonHandler,
});

export const electionReadRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler,
});

export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler,
});

export const yearbookDownloadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler,
});

export const careerSubmitRateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? req.ip ?? 'anonymous',
  handler: jsonHandler,
});

export const voteRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? req.ip ?? 'anonymous',
  handler: jsonHandler,
});

export const pinBulkRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? req.ip ?? 'anonymous',
  handler: jsonHandler,
});
