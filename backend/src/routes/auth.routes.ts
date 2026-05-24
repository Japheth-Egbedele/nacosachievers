import { Router } from 'express';
import { catchAsync } from '../utils/catch-async.js';
import { validate } from '../middleware/validate.js';
import {
  authRateLimiter,
  loginRateLimiter,
} from '../middleware/rate-limiter.js';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  validatePinSchema,
  verifyEmailSchema,
} from '../schemas/auth.schema.js';
import * as authController from '../controllers/auth.controller.js';

const router = Router();

router.post(
  '/validate-pin',
  authRateLimiter,
  validate(validatePinSchema),
  catchAsync(authController.validatePin),
);

router.post(
  '/register',
  authRateLimiter,
  validate(registerSchema),
  catchAsync(authController.register),
);

router.post(
  '/verify-email',
  authRateLimiter,
  validate(verifyEmailSchema),
  catchAsync(authController.verifyEmail),
);

router.post(
  '/login',
  loginRateLimiter,
  validate(loginSchema),
  catchAsync(authController.login),
);

router.post('/refresh', catchAsync(authController.refresh));

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
