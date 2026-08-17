import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/lib/auth';
import { SESSION_COOKIE_NAME, getSessionCookieOptions } from '@/lib/session-cookie';
import { recordActivity } from '@/lib/activity-log';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 422 });
  }

  const result = await loginUser(email, password);
  
  if (!result.success || !result.token) {
    return NextResponse.json({ error: result.error ?? 'Invalid email or password.' }, { status: 401 });
  }

  await recordActivity({
    userId: result.user?.id,
    action: 'USER_LOGIN',
    details: `Signed in as ${result.user?.role.replace(/_/g, ' ')}.`
  });

  const response = NextResponse.json({ user: result.user });
  response.cookies.set(SESSION_COOKIE_NAME, result.token, getSessionCookieOptions());

  return response;
}
