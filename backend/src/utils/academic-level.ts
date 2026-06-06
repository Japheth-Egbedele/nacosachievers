import type { UserLevel } from '../constants/enums.js';

const LEVEL_OFFSET: Record<string, number> = {
  '100': 4,
  '200': 3,
  '300': 2,
  '400': 1,
};

/** Years from entry level to expected graduation (4-year programme). */
export function expectedGraduationYear(
  levelOfEntry: string,
  yearOfAdmission: number,
): number | null {
  const offset = LEVEL_OFFSET[levelOfEntry];
  if (offset === undefined) return null;
  return yearOfAdmission + offset;
}

export function nextLevel(current: string | null): UserLevel | null {
  if (current === '100') return '200';
  if (current === '200') return '300';
  if (current === '300') return '400';
  return null;
}

export function isNumericStudentLevel(level: string | null | undefined): boolean {
  return level === '100' || level === '200' || level === '300' || level === '400';
}
