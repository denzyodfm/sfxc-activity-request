import { SESSION_TTL_SECONDS } from '@/lib/session-token';

export const SESSION_COOKIE_NAME = 'session';

export function getSessionCookieOptions() {
  return {
    maxAge: SESSION_TTL_SECONDS,
    httpOnly: true,
    // Secure by default in production. Set SESSION_COOKIE_SECURE explicitly to
    // override (e.g. "false" for local http://localhost development).
    secure: process.env.SESSION_COOKIE_SECURE
      ? process.env.SESSION_COOKIE_SECURE === 'true'
      : process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/'
  };
}
