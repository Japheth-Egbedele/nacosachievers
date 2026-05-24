export const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid credentials',
  UNAUTHORIZED: 'Unauthorized',
  FORBIDDEN: 'Forbidden',
  NOT_FOUND: 'Resource not found',
  VALIDATION_FAILED: 'Validation failed',
  INTERNAL: 'Something went wrong',
  INVALID_PIN: 'Invalid credentials',
  EMAIL_NOT_VERIFIED: 'Email verification required',
  ACCOUNT_INACTIVE: 'Account is inactive',
} as const;

export const SUCCESS_MESSAGES = {
  LOGOUT: 'Logged out successfully',
  PASSWORD_RESET_SENT: 'If an account exists, a reset link has been sent',
  EMAIL_VERIFIED: 'Email verified successfully',
} as const;
