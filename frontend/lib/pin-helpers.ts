export type IssuedPinResult = {
  id: string;
  pin: string;
  matric_number: string;
  level_of_entry?: string;
  year_of_admission?: number;
};

export function pinCredentialBlock(
  item: Pick<IssuedPinResult, 'matric_number' | 'pin'>,
  registerOrigin?: string,
): string {
  const origin =
    registerOrigin ?? (typeof window !== 'undefined' ? window.location.origin : '');
  return [
    'NACOS Hub onboarding',
    `ID: ${item.matric_number}`,
    `PIN: ${item.pin}`,
    `Register: ${origin}/hub/register`,
  ].join('\n');
}

export function pinCredentialBlocksAll(items: IssuedPinResult[], registerOrigin?: string): string {
  return items.map((item) => pinCredentialBlock(item, registerOrigin)).join('\n---\n');
}

export type PinRowForm = {
  id: string;
  matric: string;
  departmentId: string;
  level: string;
  yearOfAdmission: string;
};

let pinRowCounter = 0;

export function emptyPinRow(): PinRowForm {
  pinRowCounter += 1;
  return {
    id: `pin-row-${pinRowCounter}-${Date.now()}`,
    matric: '',
    departmentId: '',
    level: '',
    yearOfAdmission: '',
  };
}

/** Split pasted text into matric tokens (newline, comma, or whitespace). */
export function parsePastedMatrics(text: string, max = 10): string[] {
  return text
    .split(/[\n,\s]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, max);
}
