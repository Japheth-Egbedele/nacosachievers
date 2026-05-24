import { z } from 'zod';

export const validatePinSchema = z.object({
  matric_number: z.string().min(3).max(32),
  pin: z.string().length(8),
});

export const registerSchema = z.object({
  onboarding_token: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  first_name: z.string().min(1).max(64),
  last_name: z.string().min(1).max(64),
  display_name: z.string().min(1).max(128).optional(),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

export const generatePinSchema = z.object({
  matric_number: z.string().min(3).max(32),
  department_id: z.string().uuid().optional(),
  level_of_entry: z.enum(['100', '200', '300', '400', 'staff']).optional(),
  admission_type: z.enum(['regular', 'transfer', 'readmission']).optional(),
});
