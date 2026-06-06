import { z } from 'zod';

const pinCode = z.string().length(8);

export const validatePinStudentSchema = z.object({
  matric_number: z.string().min(3).max(32),
  pin: pinCode,
});

export const validatePinStaffSchema = z.object({
  staff_email: z.string().email(),
  pin: pinCode,
});

export const registerSchema = z.object({
  onboarding_token: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  first_name: z.string().min(1).max(64),
  last_name: z.string().min(1).max(64),
  display_name: z.string().min(1).max(128).optional(),
  year_of_admission: z.coerce.number().int().min(1990).max(2100).optional(),
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

export const resendVerificationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const correctPendingEmailSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  new_email: z.string().email(),
});

export const generatePinStudentSchema = z.object({
  matric_number: z.string().min(3).max(32),
  department_id: z.string().uuid(),
  level_of_entry: z.enum(['100', '200', '300', '400']),
  year_of_admission: z.coerce.number().int().min(1990).max(2100).optional(),
  admission_type: z.enum(['regular', 'transfer', 'readmission']).optional(),
});

export const generatePinStaffSchema = z.object({
  staff_email: z.string().email(),
  department_id: z.string().uuid().optional(),
  admission_type: z.enum(['regular', 'transfer', 'readmission']).optional(),
});

export const validatePinSchema = z.union([validatePinStudentSchema, validatePinStaffSchema]);
