import { randomBytes, timingSafeEqual, createHash, scryptSync } from 'crypto';

/**
 * Password hashing.
 *
 * Current format: `scrypt$N$r$p$salt$hash`
 * Legacy format:  `sha256$salt$hash`
 *
 * The legacy format was a single round of SHA-256, which a GPU can try billions
 * of times per second. scrypt is deliberately slow and memory-hard, so the same
 * hardware manages only thousands. Existing hashes still verify, and
 * needsRehash() lets the login route quietly upgrade them — see
 * lib/auth.ts. No password reset is needed.
 */

const SCRYPT_PREFIX = 'scrypt';
const LEGACY_PREFIX = 'sha256';

// ~100ms and 16MB per hash on typical hardware. High enough to hurt an attacker,
// low enough that a login still feels instant.
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 32;
const SALT_BYTES = 16;

// scrypt needs maxmem above roughly 128 * N * r bytes, and Node's default of
// 32MB is too tight for these parameters.
const MAX_MEM = 64 * 1024 * 1024;

export const MIN_PASSWORD_LENGTH = 8;

function scryptHash(password: string, salt: string, n: number, r: number, p: number) {
  return scryptSync(password.normalize('NFKC'), salt, KEY_LENGTH, {
    N: n,
    r,
    p,
    maxmem: MAX_MEM
  }).toString('hex');
}

export function hashPassword(password: string) {
  const salt = randomBytes(SALT_BYTES).toString('hex');
  const hash = scryptHash(password, salt, SCRYPT_N, SCRYPT_R, SCRYPT_P);
  return `${SCRYPT_PREFIX}$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt}$${hash}`;
}

function safeEquals(a: string, b: string) {
  const bufferA = new Uint8Array(Buffer.from(a, 'hex'));
  const bufferB = new Uint8Array(Buffer.from(b, 'hex'));

  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
}

/**
 * Verifies a password against a stored hash.
 *
 * A missing or malformed hash always fails. An account with no password set
 * cannot be signed into at all — it must be given one by an admin. (An earlier
 * version accepted the literal string "password" for such accounts, which was a
 * backdoor into any row whose hash was null.)
 */
export function verifyPassword(password: string, storedHash?: string | null) {
  if (!storedHash) {
    return false;
  }

  const parts = storedHash.split('$');

  if (parts[0] === SCRYPT_PREFIX) {
    const [, n, r, p, salt, hash] = parts;

    if (!n || !r || !p || !salt || !hash) {
      return false;
    }

    const parsedN = Number(n);
    const parsedR = Number(r);
    const parsedP = Number(p);

    if (!Number.isInteger(parsedN) || !Number.isInteger(parsedR) || !Number.isInteger(parsedP)) {
      return false;
    }

    // Read the cost parameters from the stored hash rather than the constants
    // above, so raising them later does not lock anyone out.
    return safeEquals(scryptHash(password, salt, parsedN, parsedR, parsedP), hash);
  }

  if (parts[0] === LEGACY_PREFIX) {
    const [, salt, hash] = parts;

    if (!salt || !hash) {
      return false;
    }

    const candidate = createHash('sha256').update(`${salt}:${password}`).digest('hex');
    return safeEquals(candidate, hash);
  }

  return false;
}

/**
 * True when a verified password is stored in an outdated format and should be
 * re-hashed. Callers must only act on this after verifyPassword() succeeded,
 * because re-hashing requires the plaintext.
 */
export function needsRehash(storedHash?: string | null) {
  if (!storedHash) return false;

  const parts = storedHash.split('$');

  if (parts[0] !== SCRYPT_PREFIX) {
    return true;
  }

  return Number(parts[1]) < SCRYPT_N || Number(parts[2]) < SCRYPT_R || Number(parts[3]) < SCRYPT_P;
}

/** Shared password policy for admin user creation and self-service changes. */
export function validatePassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  if (password.length > 200) {
    return 'Password must be 200 characters or fewer.';
  }

  if (/^\d+$/.test(password)) {
    return 'Password cannot be only numbers.';
  }

  const tooCommon = ['password', 'password1', '12345678', 'qwerty123', 'sfxc1234', 'admin123'];
  if (tooCommon.includes(password.toLowerCase())) {
    return 'That password is too common. Please choose another.';
  }

  return null;
}
