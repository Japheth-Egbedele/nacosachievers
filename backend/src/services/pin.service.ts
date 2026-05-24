import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { BCRYPT_ROUNDS, PIN_EXPIRY_HOURS } from '../constants/auth.js';
import { getSupabase } from '../config/supabase.js';
import { NotFoundError } from '../utils/errors.js';
import { addHours } from 'date-fns';

const PIN_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export interface OnboardingPinRow {
  id: string;
  pin_hash: string;
  matric_number: string;
  department_id: string | null;
  expires_at: string;
  is_used: boolean;
  level_of_entry: string | null;
  admission_type: string;
}

/**
 * Generates a random 8-character alphanumeric PIN.
 * @returns Plaintext PIN (shown once to admin)
 */
export function generatePlainPin(): string {
  const bytes = randomBytes(8);
  let pin = '';
  for (let i = 0; i < 8; i++) {
    pin += PIN_CHARSET[bytes[i]! % PIN_CHARSET.length];
  }
  return pin;
}

/**
 * Hashes a PIN with bcrypt.
 * @param pin Plaintext PIN
 */
export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, BCRYPT_ROUNDS);
}

/**
 * Validates matric + PIN against an unused, unexpired record.
 * @param matricNumber Matric number
 * @param pin Plaintext PIN
 * @returns Matching PIN row
 */
export async function validatePin(
  matricNumber: string,
  pin: string,
): Promise<OnboardingPinRow> {
  const { data, error } = await getSupabase()
    .from('onboarding_pins')
    .select(
      'id, pin_hash, matric_number, department_id, expires_at, is_used, level_of_entry, admission_type',
    )
    .eq('matric_number', matricNumber)
    .eq('is_used', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    throw new NotFoundError('Invalid credentials');
  }

  const valid = await bcrypt.compare(pin, data.pin_hash);
  if (!valid) {
    throw new NotFoundError('Invalid credentials');
  }

  return data as OnboardingPinRow;
}

/**
 * Creates a new onboarding PIN for a matric number.
 * @param params PIN creation params
 * @returns Plaintext PIN and row id
 */
export async function createPin(params: {
  matricNumber: string;
  createdBy: string;
  departmentId?: string;
  levelOfEntry?: string;
  admissionType?: string;
}): Promise<{ pin: string; id: string }> {
  const plain = generatePlainPin();
  const pinHash = await hashPin(plain);
  const expiresAt = addHours(new Date(), PIN_EXPIRY_HOURS).toISOString();

  const { data, error } = await getSupabase()
    .from('onboarding_pins')
    .insert({
      pin_hash: pinHash,
      matric_number: params.matricNumber,
      created_by: params.createdBy,
      department_id: params.departmentId ?? null,
      level_of_entry: params.levelOfEntry ?? null,
      admission_type: params.admissionType ?? 'regular',
      expires_at: expiresAt,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error('Failed to create PIN');
  }

  return { pin: plain, id: data.id };
}

/**
 * Returns active unused PIN row for matric (without PIN compare).
 * @param matricNumber Matric number
 */
export async function getActivePinForMatric(
  matricNumber: string,
): Promise<OnboardingPinRow | null> {
  const { data } = await getSupabase()
    .from('onboarding_pins')
    .select(
      'id, pin_hash, matric_number, department_id, expires_at, is_used, level_of_entry, admission_type',
    )
    .eq('matric_number', matricNumber)
    .eq('is_used', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as OnboardingPinRow | null) ?? null;
}

/**
 * Marks a PIN as used.
 * @param pinId PIN row id
 */
export async function markPinUsed(pinId: string): Promise<void> {
  await getSupabase()
    .from('onboarding_pins')
    .update({ is_used: true, used_at: new Date().toISOString() })
    .eq('id', pinId);
}

/**
 * Invalidates an unused PIN by id.
 * @param pinId PIN row id
 */
export async function invalidatePin(pinId: string): Promise<void> {
  const { data } = await getSupabase()
    .from('onboarding_pins')
    .select('id, is_used')
    .eq('id', pinId)
    .maybeSingle();

  if (!data || data.is_used) {
    throw new NotFoundError('PIN not found or already used');
  }

  await getSupabase()
    .from('onboarding_pins')
    .update({ expires_at: new Date().toISOString() })
    .eq('id', pinId);
}
