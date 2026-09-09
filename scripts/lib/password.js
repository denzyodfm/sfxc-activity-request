/**
 * Password hashing for command-line scripts.
 *
 * This mirrors lib/password.ts. The duplication is deliberate: `tsconfig.json`
 * sets `allowJs: false`, and these scripts run under plain Node outside the Next
 * build, so neither file can import the other. Keeping one copy here — rather
 * than one per script — means there are exactly two implementations to keep in
 * step, and tests/password-mirror.test.ts fails if they ever disagree.
 *
 * Any change to the scrypt parameters or the encoded format must be made in
 * both files.
 */

const crypto = require('crypto');

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 32;
const SALT_BYTES = 16;
const MAX_MEM = 64 * 1024 * 1024;

/**
 * Produces a `scrypt$N$r$p$salt$hash` string that lib/password.ts can verify.
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_BYTES).toString('hex');
  const hash = crypto
    .scryptSync(password.normalize('NFKC'), salt, KEY_LENGTH, {
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
      maxmem: MAX_MEM
    })
    .toString('hex');

  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt}$${hash}`;
}

// Ambiguous characters (0/O, 1/l/I) are left out so a password read off a
// printout is typed correctly the first time.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

function generatePassword(length = 14) {
  const bytes = crypto.randomBytes(length);
  let password = '';

  for (let index = 0; index < length; index += 1) {
    password += ALPHABET[bytes[index] % ALPHABET.length];
  }

  return password;
}

module.exports = { hashPassword, generatePassword, SCRYPT_N, SCRYPT_R, SCRYPT_P };
