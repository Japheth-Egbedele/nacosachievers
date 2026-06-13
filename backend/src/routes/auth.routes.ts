import { Router } from 'express';
import { catchAsync } from '../utils/catch-async.js';
import { validate } from '../middleware/validate.js';
import {
  authRateLimiter,
  correctPendingEmailRateLimiter,
  loginRateLimiter,
  refreshRateLimiter,
  registerRateLimiter,
  resendVerificationRateLimiter,
  validatePinRateLimiter,
  verifyEmailRateLimiter,
} from '../middleware/rate-limiter.js';
import {
  correctPendingEmailSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  validatePinSchema,
  verifyEmailSchema,
} from '../schemas/auth.schema.js';
import * as authController from '../controllers/auth.controller.js';

const router = Router();

router.post(
  '/validate-pin',
  validatePinRateLimiter,
  validate(validatePinSchema),
  catchAsync(authController.validatePin),
);

router.post(
  '/register',
  registerRateLimiter,
  validate(registerSchema),
  catchAsync(authController.register),
);

router.post(
  '/verify-email',
  verifyEmailRateLimiter,
  validate(verifyEmailSchema),
  catchAsync(authController.verifyEmail),
);

router.post(
  '/resend-verification',
  resendVerificationRateLimiter,
  validate(resendVerificationSchema),
  catchAsync(authController.resendVerification),
);

router.post(
  '/correct-pending-email',
  correctPendingEmailRateLimiter,
  validate(correctPendingEmailSchema),
  catchAsync(authController.correctPendingEmail),
);

router.post(
  '/login',
  loginRateLimiter,
  validate(loginSchema),
  catchAsync(authController.login),
);

router.post('/refresh', refreshRateLimiter, catchAsync(authController.refresh));

router.post('/logout', catchAsync(authController.logout));

router.post(
  '/forgot-password',
  authRateLimiter,
  validate(forgotPasswordSchema),
  catchAsync(authController.forgotPassword),
);

router.post(
  '/reset-password',
  authRateLimiter,
  validate(resetPasswordSchema),
  catchAsync(authController.resetPassword),
);

export default router;
