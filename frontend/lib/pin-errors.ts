import { ApiClientError } from '@/lib/api';

const PIN_ERROR_MESSAGES: Record<string, string> = {
  MATRIC_NOT_FOUND:
    'No onboarding PIN found for this ID number. Contact your chapter admin.',
  PIN_ALREADY_USED: 'This PIN has already been used. Ask admin for a new PIN.',
  PIN_EXPIRED: 'Your PIN has expired. Ask admin for a new PIN.',
  INVALID_PIN: 'Incorrect PIN. Double-check the code from your admin.',
};

export function pinValidationErrorMessage(err: unknown): string {
  if (err instanceof ApiClientError && err.code && PIN_ERROR_MESSAGES[err.code]) {
    return PIN_ERROR_MESSAGES[err.code];
  }
  if (err instanceof ApiClientError) return err.message;
  return 'Could not validate PIN. Try again.';
}
