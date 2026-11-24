// Server-only helpers for encrypting stored integration credentials.
// Uses AES-256-GCM with a key derived from AUTH_SECRET via scrypt.
// NEVER import this file from a client component.
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

const PREFIX = 'v1:';

function getKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET is not set — cannot encrypt credentials.');
  }
  return scryptSync(secret, 'maison-credentials-salt', 32);
}

export function encryptSecret(plaintext: string): string {
  if (!plaintext) return '';
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptSecret(value: string): string {
  if (!value) return '';
  if (!value.startsWith(PREFIX)) {
    // Stored before encryption was introduced — treat as plaintext.
    return value;
  }
  const [, ivB64, tagB64, dataB64] = value.split(':');
  const decipher = createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
}
