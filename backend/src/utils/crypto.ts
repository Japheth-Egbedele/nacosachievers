import { createHash, randomBytes, timingSafeEqual } from 'crypto';

/**
 * Generates a cryptographically secure random hex string.
 * @param byteLength Number of random bytes
 * @returns Hex-encoded string
 */
export function generateSecureToken(byteLength = 32): string {
  return randomBytes(byteLength).toString('hex');
}

/**
 * SHA-256 hash of a string, hex-encoded.
 * @param value Input string
 * @returns Hex hash
 */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * Constant-time string comparison for secrets.
 * @param a First value
 * @param b Second value
 * @returns true if equal
 */
export function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/**
 * Decodes a base64-encoded PEM key from environment.
 * @param base64Key Base64 PEM content
 * @returns PEM string
 */
export function decodePemFromBase64(base64Key: string): string {
  return Buffer.from(base64Key, 'base64').toString('utf8');
}
