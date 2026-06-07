import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { BCRYPT_ROUNDS, PIN_EXPIRY_HOURS } from '../constants/auth.js';
import { ERROR_MESSAGES } from '../constants/messages.js';
import { getSupabase } from '../config/supabase.js';
import { ForbiddenError, ValidationError } from '../utils/errors.js';
import { addHours } from 'date-fns';

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

  const plain = generatePlainPin();
  const pinHash = await hashPin(plain);
  const expiresAt = addHours(new Date(), PIN_EXPIRY_HOURS).toISOString();

  const staffEmail = isStaff ? params.staffEmail!.trim().toLowerCase() : null;
  const matricNumber = isStaff
    ? generateStaffPlaceholderMatric()
    : params.matricNumber!.trim().toUpperCase();

  const { data, error } = await getSupabase()
    .from('onboarding_pins')
    .insert({
      pin_hash: pinHash,
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
    .update({ is_used: true, used_at: new Date().toISOString() })
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
    .update({ expires_at: new Date().toISOString() })
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
