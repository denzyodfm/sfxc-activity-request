import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/lib/auth';
import { getSessionCookieOptions } from '@/lib/session-cookie';
import { recordActivity } from '@/lib/activity-log';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 422 });
  }

  const result = await loginUser(email, password);
  
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  await recordActivity({
    userId: result.user?.id,
    action: 'USER_LOGIN',
    details: `Signed in as ${result.user?.role.replace(/_/g, ' ')}.`
  });

  const response = NextResponse.json({ user: result.user });
  response.cookies.set('session', JSON.stringify(result.user), getSessionCookieOptions());

  return response;
}
