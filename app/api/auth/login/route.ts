import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/lib/auth';
import { SESSION_COOKIE_NAME, getSessionCookieOptions } from '@/lib/session-cookie';
import { recordActivity } from '@/lib/activity-log';
import { getClientIp, isIpThrottled, recordIpAttempt, clearIpAttempts } from '@/lib/login-throttle';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  // Checked before the body is even parsed, so a flood costs as little as
  // possible.
  if (isIpThrottled(ip)) {
    return NextResponse.json(
      { error: 'Too many sign-in attempts from this device. Please wait a few minutes and try again.' },
      { status: 429 }
    );
  }

  let body: { email?: unknown; password?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 422 });
  }

  recordIpAttempt(ip);

  const result = await loginUser(email, password);

  if (!result.success || !result.token) {
    await recordActivity({
      action: 'USER_LOGIN_FAILED',
      details: `Failed sign-in attempt for ${email} from ${ip}.`
    });

    // A lockout message is more specific than "invalid credentials" and is
    // passed through so the user knows waiting will help.
    return NextResponse.json({ error: result.error ?? 'Invalid email or password.' }, { status: 401 });
  }

  clearIpAttempts(ip);

  await recordActivity({
    userId: result.user?.id,
    action: 'USER_LOGIN',
    details: `Signed in as ${result.user?.role.replace(/_/g, ' ')}.`
  });

  const response = NextResponse.json({ user: result.user });
  response.cookies.set(SESSION_COOKIE_NAME, result.token, getSessionCookieOptions());

  return response;
}
