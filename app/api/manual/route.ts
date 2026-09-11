import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Serves the user handbook.
 *
 * The file lives in docs/ rather than public/ so that, like every other
 * document this system holds, it is only readable once the request carries a
 * valid session — anything under public/ is served to anyone who knows the URL.
 *
 * It is a fixed file committed with the source, never an upload, so serving it
 * as text/html at the app's own origin introduces no script the app did not
 * already ship.
 */
const MANUAL_PATH = path.join(process.cwd(), 'docs', 'USER-MANUAL.html');

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  let file: Buffer;

  try {
    file = await fs.readFile(MANUAL_PATH);
  } catch {
    return NextResponse.json(
      { error: 'The user manual is not installed on this server (docs/USER-MANUAL.html is missing).' },
      { status: 404 }
    );
  }

  return new NextResponse(file, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      // Large and unchanging between deploys; private so shared caches never
      // hold a copy for a signed-out visitor.
      'Cache-Control': 'private, max-age=3600'
    }
  });
}
