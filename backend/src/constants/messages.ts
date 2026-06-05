export const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid credentials',
  UNAUTHORIZED: 'Unauthorized',
  FORBIDDEN: 'Forbidden',
  NOT_FOUND: 'Resource not found',
  VALIDATION_FAILED: 'Validation failed',
  INTERNAL: 'Something went wrong',
  MATRIC_NOT_FOUND:
    'No onboarding PIN found for this ID number. Contact your chapter admin.',
  PIN_ALREADY_USED: 'This PIN has already been used. Ask admin for a new PIN.',
  PIN_EXPIRED: 'Your PIN has expired. Ask admin for a new PIN.',
  INVALID_PIN: 'Incorrect PIN. Double-check the code from your admin.',
  EMAIL_NOT_VERIFIED: 'Email verification required',
  ACCOUNT_INACTIVE: 'Account is inactive',
} as const;

export const SUCCESS_MESSAGES = {
  LOGOUT: 'Logged out successfully',
  PASSWORD_RESET_SENT: 'If an account exists, a reset link has been sent',
  EMAIL_VERIFIED: 'Email verified successfully',
  VERIFICATION_SENT: 'Verification email sent',
} as const;
