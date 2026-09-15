import { afterEach, describe, expect, it } from 'vitest';
import { getSessionCookieOptions } from '@/lib/session-cookie';

const originalSecureSetting = process.env.SESSION_COOKIE_SECURE;

afterEach(() => {
  if (originalSecureSetting === undefined) {
    delete process.env.SESSION_COOKIE_SECURE;
  } else {
    process.env.SESSION_COOKIE_SECURE = originalSecureSetting;
  }
});

describe('getSessionCookieOptions', () => {
  it('allows sessions on HTTP deployments unless secure cookies are explicitly enabled', () => {
    delete process.env.SESSION_COOKIE_SECURE;
    expect(getSessionCookieOptions().secure).toBe(false);
  });

  it('enables secure cookies for HTTPS-only deployments', () => {
    process.env.SESSION_COOKIE_SECURE = 'true';
    expect(getSessionCookieOptions().secure).toBe(true);
  });
});
