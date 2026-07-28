import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { recordActivity } from '@/lib/activity-log';

export async function POST() {
  const session = await getSession();
  if (session) {
    await recordActivity({
      userId: session.id,
      action: 'USER_LOGOUT',
      details: 'Signed out of the system.'
    });
  }

  const response = NextResponse.json({ message: 'Logged out.' });
  response.cookies.delete('session');
  return response;
}
