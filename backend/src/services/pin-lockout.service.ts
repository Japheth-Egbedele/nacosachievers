import { addMinutes, subMinutes } from 'date-fns';
import { getSupabase } from '../config/supabase.js';
import {
  PIN_FAILURE_WINDOW_MINUTES,
  PIN_LOCKOUT_MINUTES,
  PIN_MAX_FAILED_ATTEMPTS,
} from '../constants/auth.js';
import { ERROR_MESSAGES } from '../constants/messages.js';
import { ValidationError } from '../utils/errors.js';
import * as auditService from './audit.service.js';

type LockoutRow = {
  id: string;
  identifier: string;
  identifier_kind: string;
  failed_attempts: number;
  locked_until: string | null;
  last_failed_at: string | null;
};

function normalizeIdentifier(input: {
  matricNumber?: string;
  staffEmail?: string;
}): { identifier: string; kind: 'matric' | 'staff_email' } {
  if (input.staffEmail?.trim()) {
    return {
      identifier: input.staffEmail.trim().toLowerCase(),
      kind: 'staff_email',
    };
  }
  if (input.matricNumber?.trim()) {
    return {
      identifier: input.matricNumber.trim().toUpperCase(),
      kind: 'matric',
    };
  }
  throw new ValidationError('ID number or staff email is required');
}

/**
 * Throws if matric/staff email is temporarily locked after too many wrong PINs.
 */
export async function assertPinValidationAllowed(input: {
  matricNumber?: string;
  staffEmail?: string;
}): Promise<{ identifier: string; kind: 'matric' | 'staff_email' }> {
  const { identifier, kind } = normalizeIdentifier(input);
  const now = new Date();

  const { data, error } = await getSupabase()
    .from('pin_validation_lockouts')
    .select('id, identifier, identifier_kind, failed_attempts, locked_until, last_failed_at')
    .eq('identifier', identifier)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const row = data as LockoutRow | null;
  if (!row) {
    return { identifier, kind };
  }

  if (row.locked_until && new Date(row.locked_until) > now) {
    throw new ValidationError(ERROR_MESSAGES.PIN_VALIDATION_LOCKED, 'PIN_VALIDATION_LOCKED');
  }

  const windowStart = subMinutes(now, PIN_FAILURE_WINDOW_MINUTES);
  if (row.last_failed_at && new Date(row.last_failed_at) < windowStart) {
    await getSupabase().from('pin_validation_lockouts').delete().eq('identifier', identifier);
    return { identifier, kind };
  }

  if (row.locked_until && new Date(row.locked_until) <= now) {
    await getSupabase().from('pin_validation_lockouts').delete().eq('identifier', identifier);
  }

  return { identifier, kind };
}

/**
 * Records a wrong PIN for an existing onboarding PIN row. Locks after N failures.
 */
export async function recordPinValidationFailure(
  input: {
    matricNumber?: string;
    staffEmail?: string;
  },
  ipAddress?: string | null,
): Promise<void> {
  const { identifier, kind } = normalizeIdentifier(input);
  const now = new Date();
  const windowStart = subMinutes(now, PIN_FAILURE_WINDOW_MINUTES);

  const { data: existing } = await getSupabase()
    .from('pin_validation_lockouts')
    .select('id, failed_attempts, last_failed_at')
    .eq('identifier', identifier)
    .maybeSingle();

  let failedAttempts = 1;
  if (existing) {
    const lastFailed = existing.last_failed_at ? new Date(existing.last_failed_at) : null;
    if (lastFailed && lastFailed >= windowStart) {
      failedAttempts = (existing.failed_attempts ?? 0) + 1;
    }
  }

  const lockedUntil =
    failedAttempts >= PIN_MAX_FAILED_ATTEMPTS
      ? addMinutes(now, PIN_LOCKOUT_MINUTES).toISOString()
      : null;

  await getSupabase()
    .from('pin_validation_lockouts')
    .upsert(
      {
        identifier,
        identifier_kind: kind,
        failed_attempts: failedAttempts,
        locked_until: lockedUntil,
        last_failed_at: now.toISOString(),
        updated_at: now.toISOString(),
      },
      { onConflict: 'identifier' },
    );

  if (lockedUntil) {
    await auditService.logAudit({
      action: 'pin_validation_locked',
      entityType: 'pin_validation_lockout',
      metadata: {
        identifier,
        identifier_kind: kind,
        failed_attempts: failedAttempts,
        locked_until: lockedUntil,
      },
      ipAddress,
    });
  }
}

/** Clears lockout state after successful PIN validation. */
export async function clearPinValidationLockout(input: {
  matricNumber?: string;
  staffEmail?: string;
}): Promise<void> {
  const { identifier } = normalizeIdentifier(input);
  await getSupabase().from('pin_validation_lockouts').delete().eq('identifier', identifier);
}
