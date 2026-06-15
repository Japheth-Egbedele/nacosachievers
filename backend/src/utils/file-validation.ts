import { ValidationError } from './errors.js';

const PDF_MAGIC = Buffer.from('%PDF');
const OLE_MAGIC = Buffer.from([0xd0, 0xcf, 0x11, 0xe0]);
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

export type VaultMaterialMime =
  | 'application/pdf'
  | 'application/msword'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const VAULT_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const VAULT_MATERIAL_MIMES: VaultMaterialMime[] = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

/**
 * Validates buffer is a PDF via magic bytes.
 */
export function assertPdfMagic(buffer: Buffer): void {
  if (buffer.length < 4 || !buffer.subarray(0, 4).equals(PDF_MAGIC)) {
    throw new ValidationError('File must be a valid PDF');
  }
}

/**
 * Validates legacy Word .doc (OLE compound file).
 */
export function assertDocMagic(buffer: Buffer): void {
  if (buffer.length < 4 || !buffer.subarray(0, 4).equals(OLE_MAGIC)) {
    throw new ValidationError('File must be a valid DOC document');
  }
}

/**
 * Validates Word .docx (ZIP-based Office Open XML).
 */
export function assertDocxMagic(buffer: Buffer): void {
  if (buffer.length < 4 || !buffer.subarray(0, 4).equals(ZIP_MAGIC)) {
    throw new ValidationError('File must be a valid DOCX document');
  }
}

const IMAGE_MAGICS: { mime: string; bytes: number[] }[] = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] },
];

/**
 * Validates image magic bytes (JPEG, PNG, WebP).
 */
export function assertImageMagic(buffer: Buffer): void {
  const match = IMAGE_MAGICS.some((m) =>
    m.bytes.every((byte, i) => buffer[i] === byte),
  );
  if (!match) {
    throw new ValidationError('Image must be JPEG, PNG, or WebP');
  }
}

/**
 * Validates vault material file by declared MIME.
 */
export function assertMaterialMagic(buffer: Buffer, mime: string): void {
  if (mime === 'application/pdf') {
    assertPdfMagic(buffer);
    return;
  }
  if (mime === 'application/msword') {
    assertDocMagic(buffer);
    return;
  }
  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    assertDocxMagic(buffer);
    return;
  }
  throw new ValidationError('Unsupported document type');
}

/**
 * Sniffs material MIME from magic bytes when client MIME is unreliable.
 */
export function sniffMaterialMime(buffer: Buffer): VaultMaterialMime | null {
  if (buffer.length >= 4 && buffer.subarray(0, 4).equals(PDF_MAGIC)) {
    return 'application/pdf';
  }
  if (buffer.length >= 4 && buffer.subarray(0, 4).equals(OLE_MAGIC)) {
    return 'application/msword';
  }
  if (buffer.length >= 4 && buffer.subarray(0, 4).equals(ZIP_MAGIC)) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  return null;
}
