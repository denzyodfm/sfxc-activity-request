import { createHash } from 'crypto';
import { describe, expect, it } from 'vitest';
import {
  MIN_PASSWORD_LENGTH,
  hashPassword,
  needsRehash,
  validatePassword,
  verifyPassword
} from '@/lib/password';

/** Builds a hash in the retired sha256 format, the way the old seed did. */
function legacyHash(password: string, salt = 'sfxc-demo-salt') {
  return `sha256$${salt}$${createHash('sha256').update(`${salt}:${password}`).digest('hex')}`;
}

describe('hashPassword / verifyPassword', () => {
  it('round-trips a password', () => {
    const hash = hashPassword('correct horse battery');
    expect(verifyPassword('correct horse battery', hash)).toBe(true);
  });

  it('rejects the wrong password', () => {
    const hash = hashPassword('correct horse battery');
    expect(verifyPassword('correct horse batteru', hash)).toBe(false);
    expect(verifyPassword('', hash)).toBe(false);
  });

  it('salts each hash separately, so identical passwords hash differently', () => {
    expect(hashPassword('same password')).not.toBe(hashPassword('same password'));
  });

  it('emits the documented scrypt encoding', () => {
    const [scheme, n, r, p, salt, hash] = hashPassword('whatever').split('$');
    expect(scheme).toBe('scrypt');
    expect(Number(n)).toBeGreaterThanOrEqual(16384);
    expect(Number(r)).toBeGreaterThanOrEqual(8);
    expect(Number(p)).toBeGreaterThanOrEqual(1);
    expect(salt).toMatch(/^[0-9a-f]{32}$/);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('normalises unicode, so the same typed password verifies either way', () => {
    // U+00F1 vs. n + U+0303 — the same character, two encodings.
    const hash = hashPassword('mañana');
    expect(verifyPassword('mañana', hash)).toBe(true);
  });

  // An account with no password must not be signable-into. An earlier version
  // accepted the literal string "password" for these rows.
  it('refuses a missing hash rather than falling back', () => {
    expect(verifyPassword('password', null)).toBe(false);
    expect(verifyPassword('password', undefined)).toBe(false);
    expect(verifyPassword('password', '')).toBe(false);
    expect(verifyPassword('', null)).toBe(false);
  });

  it('refuses malformed and unknown-scheme hashes instead of throwing', () => {
    for (const stored of [
      'not-a-hash',
      'scrypt$',
      'scrypt$16384$8$1$onlyfivefields',
      'scrypt$notanumber$8$1$aabb$ccdd',
      'bcrypt$2b$10$abcdef',
      'sha256$saltonly',
      '$$$$$'
    ]) {
      expect(() => verifyPassword('password', stored)).not.toThrow();
      expect(verifyPassword('password', stored)).toBe(false);
    }
  });

  it('reads cost parameters from the stored hash, so raising them locks nobody out', () => {
    // A hash written under cheaper parameters than the current defaults.
    const weak = hashPassword('legacy cost').replace(/^scrypt\$\d+/, 'scrypt$16384');
    expect(verifyPassword('legacy cost', weak)).toBe(true);
  });
});

describe('legacy sha256 hashes', () => {
  it('still verify, so the old seed accounts can sign in once more', () => {
    expect(verifyPassword('password', legacyHash('password'))).toBe(true);
  });

  it('reject the wrong password', () => {
    expect(verifyPassword('Password', legacyHash('password'))).toBe(false);
  });
});

describe('needsRehash', () => {
  it('is false for a hash at the current parameters', () => {
    expect(needsRehash(hashPassword('current'))).toBe(false);
  });

  it('is true for a legacy sha256 hash, so login upgrades it in place', () => {
    expect(needsRehash(legacyHash('password'))).toBe(true);
  });

  it('is true when the stored cost is below the current parameters', () => {
    const cheap = hashPassword('cheap').replace(/^scrypt\$16384\$8\$1/, 'scrypt$1024$4$1');
    expect(needsRehash(cheap)).toBe(true);
  });

  it('is false for no hash at all — there is nothing to upgrade', () => {
    expect(needsRehash(null)).toBe(false);
    expect(needsRehash(undefined)).toBe(false);
    expect(needsRehash('')).toBe(false);
  });
});

describe('validatePassword', () => {
  it('accepts a reasonable password', () => {
    expect(validatePassword('an ordinary passphrase')).toBeNull();
  });

  it('enforces the minimum length at the boundary', () => {
    expect(validatePassword('a'.repeat(MIN_PASSWORD_LENGTH - 1))).toMatch(/at least/);
    expect(validatePassword('abcdefgh1')).toBeNull();
  });

  it('enforces the maximum length at the boundary', () => {
    expect(validatePassword(`${'a'.repeat(199)}1`)).toBeNull();
    expect(validatePassword(`${'a'.repeat(200)}1`)).toMatch(/200 characters or fewer/);
  });

  it('rejects all-digit passwords', () => {
    expect(validatePassword('9081726354')).toMatch(/only numbers/);
  });

  it('rejects the common passwords, case-insensitively', () => {
    for (const common of ['password', 'PASSWORD', 'Password1', '12345678', 'sfxc1234', 'admin123']) {
      expect(validatePassword(common)).not.toBeNull();
    }
  });

  // The old seed set every account to this. Guards against it coming back.
  it('rejects the password the retired seed used', () => {
    expect(validatePassword('password')).toMatch(/too common/);
  });
});
