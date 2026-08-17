import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Returns the current user for the client-side session context.
 *
 * This must go through getSession() so the signature is verified and the user is
 * read from the database. Parsing the cookie directly would let a client define
 * its own identity.
 */
export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({ user: session });
}
