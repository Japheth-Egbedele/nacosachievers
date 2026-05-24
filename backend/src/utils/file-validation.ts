import { ValidationError } from './errors.js';

const PDF_MAGIC = Buffer.from('%PDF');

/**
 * Validates buffer is a PDF via magic bytes.
 * @param buffer File buffer
 */
export function assertPdfMagic(buffer: Buffer): void {
  if (buffer.length < 4 || !buffer.subarray(0, 4).equals(PDF_MAGIC)) {
    throw new ValidationError('File must be a valid PDF');
  }
}

const IMAGE_MAGICS: { mime: string; bytes: number[] }[] = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] },
];

/**
 * Validates image magic bytes (JPEG, PNG, WebP).
 * @param buffer File buffer
 */
export function assertImageMagic(buffer: Buffer): void {
  const match = IMAGE_MAGICS.some((m) =>
    m.bytes.every((byte, i) => buffer[i] === byte),
  );
  if (!match) {
    throw new ValidationError('Image must be JPEG, PNG, or WebP');
  }
}
