import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const ALGO = 'aes-256-gcm';

function recoveryKey(): Buffer | null {
  const raw = process.env.PIN_RECOVERY_ENCRYPTION_KEY?.trim();
  if (!raw) return null;
  return createHash('sha256').update(raw).digest();
}

export function isPinRecoveryEnabled(): boolean {
  return recoveryKey() !== null;
}

/** Encrypt a plaintext PIN for admin recovery. Returns null when encryption is not configured. */
export function encryptPinForRecovery(plain: string): string | null {
  const key = recoveryKey();
  if (!key) return null;

  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    'v1',
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join(':');
}

export function decryptPinFromRecovery(ciphertext: string): string {
  const key = recoveryKey();
  if (!key) {
    throw new Error('PIN recovery encryption is not configured');
  }

  const parts = ciphertext.split(':');
  if (parts.length !== 4 || parts[0] !== 'v1') {
    throw new Error('Invalid PIN recovery ciphertext');
  }

  const iv = Buffer.from(parts[1]!, 'base64url');
  const tag = Buffer.from(parts[2]!, 'base64url');
  const encrypted = Buffer.from(parts[3]!, 'base64url');

  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return plain.toString('utf8');
}
