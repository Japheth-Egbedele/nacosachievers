import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { BCRYPT_ROUNDS } from '../constants/auth.js';
import { ERROR_MESSAGES } from '../constants/messages.js';
import { getSupabase } from '../config/supabase.js';
import { ForbiddenError, ValidationError } from '../utils/errors.js';
import { addHours } from 'date-fns';
import * as settingsService from './settings.service.js';
import {
  decryptPinFromRecovery,
  encryptPinForRecovery,
  isPinRecoveryEnabled,
} from '../utils/pin-crypto.js';

const PIN_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export interface OnboardingPinRow {
  id: string;
  pin_hash: string;
  matric_number: string;
  staff_email: string | null;
  department_id: string | null;
  created_by: string | null;
  expires_at: string;
  is_used: boolean;
  level_of_entry: string | null;
  year_of_admission: number | null;
  admission_type: string;
}

const PIN_SELECT =
  'id, pin_hash, matric_number, staff_email, department_id, created_by, expires_at, is_used, level_of_entry, year_of_admission, admission_type';

function generateStaffPlaceholderMatric(): string {
  const bytes = randomBytes(4);
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += PIN_CHARSET[bytes[i]! % PIN_CHARSET.length];
  }
  return `STAFF-${suffix}`;
}

async function resolveActivePin(
  rows: OnboardingPinRow[] | null,
  pin: string,
): Promise<OnboardingPinRow> {
  if (!rows?.length) {
    throw new ValidationError(ERROR_MESSAGES.MATRIC_NOT_FOUND, 'MATRIC_NOT_FOUND');
  }

  const now = new Date();

  if (rows.every((row) => row.is_used)) {
    throw new ValidationError(ERROR_MESSAGES.PIN_ALREADY_USED, 'PIN_ALREADY_USED');
  }

  const active = rows.find((row) => !row.is_used && new Date(row.expires_at) > now);
  if (!active) {
    throw new ValidationError(ERROR_MESSAGES.PIN_EXPIRED, 'PIN_EXPIRED');
  }

  const valid = await bcrypt.compare(pin, active.pin_hash);
  if (!valid) {
    throw new ValidationError(ERROR_MESSAGES.INVALID_PIN, 'INVALID_PIN');
  }

  return active;
}

export function generatePlainPin(): string {
  const bytes = randomBytes(8);
  let pin = '';
  for (let i = 0; i < 8; i++) {
    pin += PIN_CHARSET[bytes[i]! % PIN_CHARSET.length];
  }
  return pin;
}

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, BCRYPT_ROUNDS);
}

export async function validatePinByMatric(
  matricNumber: string,
  pin: string,
): Promise<OnboardingPinRow> {
  const normalized = matricNumber.trim().toUpperCase();
  const { data: rows, error } = await getSupabase()
    .from('onboarding_pins')
    .select(PIN_SELECT)
    .eq('matric_number', normalized)
    .is('staff_email', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return resolveActivePin(rows as OnboardingPinRow[] | null, pin);
}

export async function validatePinByStaffEmail(
  staffEmail: string,
  pin: string,
): Promise<OnboardingPinRow> {
  const normalized = staffEmail.trim().toLowerCase();
  const { data: rows, error } = await getSupabase()
    .from('onboarding_pins')
    .select(PIN_SELECT)
    .eq('staff_email', normalized)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return resolveActivePin(rows as OnboardingPinRow[] | null, pin);
}

export async function createPin(params: {
  createdBy: string;
  matricNumber?: string;
  staffEmail?: string;
  departmentId?: string;
  levelOfEntry?: string;
  admissionType?: string;
  yearOfAdmission?: number;
  allowStaff?: boolean;
}): Promise<{ pin: string; id: string; matric_number: string; staff_email?: string }> {
  const isStaff = params.levelOfEntry === 'staff' || Boolean(params.staffEmail);

  if (isStaff) {
    if (!params.allowStaff) {
      throw new ForbiddenError('Only super admins can issue staff onboarding PINs');
    }
    if (!params.staffEmail?.trim()) {
      throw new ValidationError('Work email is required for staff PINs');
    }
  } else if (!params.matricNumber?.trim()) {
    throw new ValidationError('ID number is required for student PINs');
  }

  if (isStaff && params.levelOfEntry && params.levelOfEntry !== 'staff') {
    throw new ValidationError('Staff PINs must use level staff');
  }

  if (!isStaff && params.levelOfEntry === 'staff') {
    throw new ValidationError('Student PINs cannot use staff level');
  }

  if (!isStaff && !params.levelOfEntry) {
    throw new ValidationError('Level of entry is required for student PINs');
  }

  const plain = generatePlainPin();
  const pinHash = await hashPin(plain);
  const pinCiphertext = encryptPinForRecovery(plain);
  const expiryHours = await settingsService.getPinExpiryHours();
  const expiresAt = addHours(new Date(), expiryHours).toISOString();

  const staffEmail = isStaff ? params.staffEmail!.trim().toLowerCase() : null;
  const matricNumber = isStaff
    ? generateStaffPlaceholderMatric()
    : params.matricNumber!.trim().toUpperCase();

  const { data, error } = await getSupabase()
    .from('onboarding_pins')
    .insert({
      pin_hash: pinHash,
      pin_ciphertext: pinCiphertext,
      matric_number: matricNumber,
      staff_email: staffEmail,
      created_by: params.createdBy,
      department_id: params.departmentId ?? null,
      level_of_entry: isStaff ? 'staff' : (params.levelOfEntry ?? null),
      year_of_admission: params.yearOfAdmission ?? null,
      admission_type: params.admissionType ?? 'regular',
      expires_at: expiresAt,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error('Failed to create PIN');
  }

  return {
    pin: plain,
    id: data.id,
    matric_number: matricNumber,
    ...(staffEmail ? { staff_email: staffEmail } : {}),
  };
}

export async function getActivePinById(pinId: string): Promise<OnboardingPinRow | null> {
  const { data } = await getSupabase()
    .from('onboarding_pins')
    .select(PIN_SELECT)
    .eq('id', pinId)
    .eq('is_used', false)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  return (data as OnboardingPinRow | null) ?? null;
}

export async function markPinUsed(pinId: string): Promise<void> {
  await getSupabase()
    .from('onboarding_pins')
    .update({
      is_used: true,
      used_at: new Date().toISOString(),
      pin_ciphertext: null,
    })
    .eq('id', pinId);
}

export async function invalidatePin(
  pinId: string,
  actorId: string,
  isSuperAdmin: boolean,
): Promise<void> {
  const { data } = await getSupabase()
    .from('onboarding_pins')
    .select('id, is_used, created_by')
    .eq('id', pinId)
    .maybeSingle();

  if (!data || data.is_used) {
    throw new ValidationError(ERROR_MESSAGES.PIN_ALREADY_USED, 'PIN_ALREADY_USED');
  }

  if (!isSuperAdmin && data.created_by !== actorId) {
    throw new ForbiddenError('You can only invalidate PINs you issued');
  }

  await getSupabase()
    .from('onboarding_pins')
    .update({ expires_at: new Date().toISOString(), pin_ciphertext: null })
    .eq('id', pinId);
}

/** Expires PIN rows immediately (bulk rollback). */
export async function expirePinIds(pinIds: string[]): Promise<void> {
  if (pinIds.length === 0) return;
  await getSupabase()
    .from('onboarding_pins')
    .update({ expires_at: new Date().toISOString() })
    .in('id', pinIds);
}

export interface PinListRow {
  id: string;
  matric_number: string;
  staff_email: string | null;
  department_id: string | null;
  created_by: string | null;
  expires_at: string;
  is_used: boolean;
  used_at: string | null;
  level_of_entry: string | null;
  year_of_admission: number | null;
  admission_type: string;
  created_at: string;
  is_expired: boolean;
  is_active: boolean;
  has_recovery: boolean;
  can_reveal: boolean;
}

/** Lists recent PINs for the issuer (super admin sees all). */
export async function listPinsForActor(
  actorId: string,
  isSuperAdmin: boolean,
  limit = 50,
): Promise<PinListRow[]> {
  let query = getSupabase()
    .from('onboarding_pins')
    .select(
      'id, matric_number, staff_email, department_id, created_by, expires_at, is_used, used_at, level_of_entry, year_of_admission, admission_type, created_at, pin_ciphertext',
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!isSuperAdmin) {
    query = query.eq('created_by', actorId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const now = Date.now();
  return (data ?? []).map((row) => {
    const record = row as Omit<PinListRow, 'is_expired' | 'is_active' | 'has_recovery' | 'can_reveal'> & {
      pin_ciphertext: string | null;
    };
    const isExpired = !record.is_used && new Date(record.expires_at).getTime() <= now;
    const isActive = !record.is_used && new Date(record.expires_at).getTime() > now;
    const hasRecovery = Boolean(record.pin_ciphertext);
    return {
      id: record.id,
      matric_number: record.matric_number,
      staff_email: record.staff_email,
      department_id: record.department_id,
      created_by: record.created_by,
      expires_at: record.expires_at,
      is_used: record.is_used,
      used_at: record.used_at,
      level_of_entry: record.level_of_entry,
      year_of_admission: record.year_of_admission,
      admission_type: record.admission_type,
      created_at: record.created_at,
      is_expired: isExpired,
      is_active: isActive,
      has_recovery: hasRecovery,
      can_reveal: isActive && hasRecovery,
    };
  });
}

export async function revealPinForActor(
  pinId: string,
  actorId: string,
  isSuperAdmin: boolean,
): Promise<{
  id: string;
  pin: string;
  matric_number: string;
  staff_email: string | null;
  level_of_entry: string | null;
  expires_at: string;
}> {
  const { data, error } = await getSupabase()
    .from('onboarding_pins')
    .select(
      'id, matric_number, staff_email, created_by, expires_at, is_used, level_of_entry, pin_ciphertext',
    )
    .eq('id', pinId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new ValidationError('PIN not found', 'PIN_NOT_FOUND');
  }

  if (!isSuperAdmin && data.created_by !== actorId) {
    throw new ForbiddenError('You can only reveal PINs you issued');
  }

  if (data.is_used) {
    throw new ValidationError(ERROR_MESSAGES.PIN_ALREADY_USED, 'PIN_ALREADY_USED');
  }

  if (new Date(data.expires_at as string).getTime() <= Date.now()) {
    throw new ValidationError(ERROR_MESSAGES.PIN_EXPIRED, 'PIN_EXPIRED');
  }

  if (!data.pin_ciphertext) {
    throw new ValidationError(
      'This PIN was issued before recovery was enabled. Invalidate it and issue a new PIN.',
      'PIN_RECOVERY_UNAVAILABLE',
    );
  }

  const pin = decryptPinFromRecovery(data.pin_ciphertext as string);

  return {
    id: data.id as string,
    pin,
    matric_number: data.matric_number as string,
    staff_email: (data.staff_email as string | null) ?? null,
    level_of_entry: (data.level_of_entry as string | null) ?? null,
    expires_at: data.expires_at as string,
  };
}

export function getPinRecoveryStatus(): { enabled: boolean } {
  return { enabled: isPinRecoveryEnabled() };
}

/** @deprecated Use validatePinByMatric */
export async function validatePin(matricNumber: string, pin: string): Promise<OnboardingPinRow> {
  return validatePinByMatric(matricNumber, pin);
}

/** @deprecated Use getActivePinById */
export async function getActivePinForMatric(
  matricNumber: string,
): Promise<OnboardingPinRow | null> {
  const { data } = await getSupabase()
    .from('onboarding_pins')
    .select(PIN_SELECT)
    .eq('matric_number', matricNumber)
    .is('staff_email', null)
    .eq('is_used', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as OnboardingPinRow | null) ?? null;
}
