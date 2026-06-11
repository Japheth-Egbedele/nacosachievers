import { ApiClientError } from '@/lib/api';

const PIN_ERROR_MESSAGES: Record<string, string> = {
  MATRIC_NOT_FOUND:
    'No onboarding PIN found for this ID number. Contact your chapter admin.',
  PIN_ALREADY_USED: 'This PIN has already been used. Ask admin for a new PIN.',
  PIN_EXPIRED: 'Your PIN has expired. Ask admin for a new PIN.',
  INVALID_PIN: 'Incorrect PIN. Double-check the code from your admin.',
  PIN_VALIDATION_LOCKED:
    'Too many incorrect PIN attempts for this ID. Wait 30 minutes or contact your chapter admin.',
  PIN_MISSING_LEVEL:
    'This PIN has no level assigned. Ask your chapter admin to re-issue your PIN with a level.',
  RATE_LIMIT:
    'Too many attempts. Wait a few minutes and try again. On shared WiFi, try mobile data.',
};

export function pinValidationErrorMessage(err: unknown): string {
  if (err instanceof ApiClientError && err.code && PIN_ERROR_MESSAGES[err.code]) {
    return PIN_ERROR_MESSAGES[err.code];
  }
  if (err instanceof ApiClientError) return err.message;
  return 'Could not validate PIN. Try again.';
}

export function registrationErrorMessage(err: unknown): string {
  if (err instanceof ApiClientError && err.code && PIN_ERROR_MESSAGES[err.code]) {
    return PIN_ERROR_MESSAGES[err.code];
  }
  if (err instanceof ApiClientError) return err.message;
  return 'Registration failed';
}
