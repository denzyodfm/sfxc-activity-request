import { createRequire } from 'module';
import { describe, expect, it } from 'vitest';
import {
  hashPassword as appHashPassword,
  needsRehash,
  validatePassword,
  verifyPassword
} from '@/lib/password';

/**
 * scripts/lib/password.js is a hand-kept copy of lib/password.ts. The copy
 * exists because tsconfig sets `allowJs: false` and the CLI scripts run outside
 * the Next build, so neither file can import the other.
 *
 * These tests are the thing that stops the two drifting. If someone changes the
 * scrypt parameters or the encoded format on one side only, a hash written by
 * the scripts stops verifying in the app — silently, and only for accounts
 * touched by a script. Here it fails loudly instead.
 */
const require = createRequire(import.meta.url);
const scripts = require('../scripts/lib/password.js') as {
  hashPassword: (password: string) => string;
  generatePassword: (length?: number) => string;
  SCRYPT_N: number;
  SCRYPT_R: number;
  SCRYPT_P: number;
};

describe('scripts/lib/password.js mirrors lib/password.ts', () => {
  it('produces hashes the app can verify', () => {
    const hash = scripts.hashPassword('seeded password');
    expect(verifyPassword('seeded password', hash)).toBe(true);
    expect(verifyPassword('some other password', hash)).toBe(false);
  });

  it('produces hashes the app does not immediately want to re-hash', () => {
    // If the script's cost parameters fell behind lib/password.ts, every seeded
    // account would be re-hashed on its first login. That is survivable, but it
    // means the two files disagree, which is what this file is here to catch.
    expect(needsRehash(scripts.hashPassword('seeded password'))).toBe(false);
  });

  it('uses the same scrypt parameters', () => {
    const [, n, r, p] = scripts.hashPassword('x').split('$');
    const [, appN, appR, appP] = appHashPassword('x').split('$');

    expect([n, r, p]).toEqual([appN, appR, appP]);
    expect([Number(n), Number(r), Number(p)]).toEqual([
      scripts.SCRYPT_N,
      scripts.SCRYPT_R,
      scripts.SCRYPT_P
    ]);
  });
});

describe('generatePassword', () => {
  it('returns the requested length, defaulting to 14', () => {
    expect(scripts.generatePassword()).toHaveLength(14);
    expect(scripts.generatePassword(20)).toHaveLength(20);
  });

  it('omits characters that are misread off a printout', () => {
    // 0/O and 1/l/I are the pairs people get wrong when typing from paper.
    const sample = Array.from({ length: 200 }, () => scripts.generatePassword(32)).join('');
    expect(sample).not.toMatch(/[0O1lI]/);
  });

  it('does not repeat itself', () => {
    const generated = new Set(Array.from({ length: 100 }, () => scripts.generatePassword()));
    expect(generated.size).toBe(100);
  });

  it('produces passwords the app would accept', () => {
    for (let index = 0; index < 50; index += 1) {
      expect(validatePassword(scripts.generatePassword())).toBeNull();
    }
  });
});
