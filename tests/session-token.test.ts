import { createHmac } from 'crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SESSION_TTL_SECONDS,
  createSessionToken,
  verifySessionToken
} from '@/lib/session-token';

const SECRET = 'test-secret-that-is-long-enough-to-pass-validation';

beforeEach(() => {
  process.env.SESSION_SECRET = SECRET;
});

afterEach(() => {
  process.env.SESSION_SECRET = SECRET;
  vi.useRealTimers();
});

/** Re-encodes a token's payload, leaving the original signature in place. */
function tamperPayload(token: string, change: (payload: Record<string, unknown>) => void) {
  const separator = token.lastIndexOf('.');
  const payload = JSON.parse(
    Buffer.from(token.slice(0, separator), 'base64url').toString('utf8')
  );
  change(payload);
  const forged = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${forged}.${token.slice(separator + 1)}`;
}

describe('createSessionToken', () => {
  it('round-trips the user id and token version', () => {
    const payload = verifySessionToken(createSessionToken('user-1', 7));
    expect(payload?.sub).toBe('user-1');
    expect(payload?.ver).toBe(7);
  });

  it('defaults the version to 0, matching the column default', () => {
    expect(verifySessionToken(createSessionToken('user-1'))?.ver).toBe(0);
  });

  it('sets the expiry one TTL after issue', () => {
    const payload = verifySessionToken(createSessionToken('user-1'));
    expect(payload!.exp - payload!.iat).toBe(SESSION_TTL_SECONDS);
  });
});

describe('verifySessionToken', () => {
  it('rejects empty input', () => {
    expect(verifySessionToken(undefined)).toBeNull();
    expect(verifySessionToken(null)).toBeNull();
    expect(verifySessionToken('')).toBeNull();
  });

  it('rejects tokens with no signature separator', () => {
    expect(verifySessionToken('no-separator-at-all')).toBeNull();
    expect(verifySessionToken('.leading-separator')).toBeNull();
  });

  it('rejects a token whose signature has been changed', () => {
    const token = createSessionToken('user-1');
    expect(verifySessionToken(`${token.slice(0, -1)}X`)).toBeNull();
  });

  // The whole point of signing the cookie: the client must not be able to
  // rewrite the payload and stay signed in.
  it('rejects a payload edited to impersonate another user', () => {
    const forged = tamperPayload(createSessionToken('user-1'), (payload) => {
      payload.sub = 'admin-user';
    });
    expect(verifySessionToken(forged)).toBeNull();
  });

  it('rejects a payload edited to extend its own expiry', () => {
    const forged = tamperPayload(createSessionToken('user-1'), (payload) => {
      payload.exp = Math.floor(Date.now() / 1000) + 10 * 365 * 24 * 60 * 60;
    });
    expect(verifySessionToken(forged)).toBeNull();
  });

  it('rejects a payload edited to lower its version past a revocation', () => {
    const forged = tamperPayload(createSessionToken('user-1', 5), (payload) => {
      payload.ver = 0;
    });
    expect(verifySessionToken(forged)).toBeNull();
  });

  it('rejects a token signed with a different secret', () => {
    const token = createSessionToken('user-1');
    process.env.SESSION_SECRET = 'a-completely-different-secret-of-good-length';
    expect(verifySessionToken(token)).toBeNull();
  });

  it('rejects a correctly signed token whose payload is not JSON', () => {
    // Signed with the real secret, so only the JSON parse can reject it.
    const encoded = Buffer.from('not json at all').toString('base64url');
    const signature = createHmac('sha256', SECRET).update(encoded).digest('base64url');
    expect(verifySessionToken(`${encoded}.${signature}`)).toBeNull();
  });

  it('expires a token once its expiry passes', () => {
    const token = createSessionToken('user-1');
    expect(verifySessionToken(token)).not.toBeNull();

    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + (SESSION_TTL_SECONDS + 1) * 1000);
    expect(verifySessionToken(token)).toBeNull();
  });

  it('still accepts a token one second before it expires', () => {
    const token = createSessionToken('user-1');
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + (SESSION_TTL_SECONDS - 1) * 1000);
    expect(verifySessionToken(token)).not.toBeNull();
  });

  // Adding the version field must not have signed everyone out.
  it('treats a token with no version field as version 0', () => {
    const issuedAt = Math.floor(Date.now() / 1000);
    const encoded = Buffer.from(
      JSON.stringify({ sub: 'user-1', iat: issuedAt, exp: issuedAt + SESSION_TTL_SECONDS })
    ).toString('base64url');
    const signature = createHmac('sha256', SECRET).update(encoded).digest('base64url');

    expect(verifySessionToken(`${encoded}.${signature}`)?.ver).toBe(0);
  });
});

describe('the secret is a configuration error, not a login failure', () => {
  it('throws when SESSION_SECRET is absent', () => {
    delete process.env.SESSION_SECRET;
    expect(() => createSessionToken('user-1')).toThrow(/SESSION_SECRET is not set/);
  });

  it('throws when SESSION_SECRET is too short to be worth signing with', () => {
    process.env.SESSION_SECRET = 'short';
    expect(() => createSessionToken('user-1')).toThrow(/at least 32 characters/);
  });
});
