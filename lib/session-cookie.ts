import { SESSION_TTL_SECONDS } from '@/lib/session-token';

export const SESSION_COOKIE_NAME = 'session';

export function getSessionCookieOptions() {
  return {
    maxAge: SESSION_TTL_SECONDS,
    httpOnly: true,
    // Raw-IP deployments may be served over HTTP, where browsers reject Secure
    // cookies entirely. Opt in once the deployment is HTTPS-only.
    secure: process.env.SESSION_COOKIE_SECURE === 'true',
    sameSite: 'lax' as const,
    path: '/'
  };
}
