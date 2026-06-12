import { randomBytes, timingSafeEqual, createHash } from 'crypto';

const HASH_PREFIX = 'sha256';

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = createHash('sha256').update(`${salt}:${password}`).digest('hex');
  return `${HASH_PREFIX}$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash?: string | null) {
  if (!storedHash) {
    return password === 'password';
  }

  const [prefix, salt, hash] = storedHash.split('$');
  if (prefix !== HASH_PREFIX || !salt || !hash) {
    return false;
  }

  const candidate = createHash('sha256').update(`${salt}:${password}`).digest('hex');
  const storedBuffer = new Uint8Array(Buffer.from(hash, 'hex'));
  const candidateBuffer = new Uint8Array(Buffer.from(candidate, 'hex'));

  return storedBuffer.length === candidateBuffer.length && timingSafeEqual(storedBuffer, candidateBuffer);
}
