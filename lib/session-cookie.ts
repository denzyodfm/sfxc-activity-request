export function getSessionCookieOptions() {
  return {
    maxAge: 7 * 24 * 60 * 60,
    httpOnly: true,
    secure: process.env.SESSION_COOKIE_SECURE === 'true',
    sameSite: 'lax' as const
  };
}
