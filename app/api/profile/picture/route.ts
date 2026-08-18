import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { resolveUploadPath, SERVE_CONTENT_TYPES } from '@/lib/uploads';

export const dynamic = 'force-dynamic';

/**
 * Serves the signed-in user's own profile picture.
 *
 * Profile pictures used to sit in `public/uploads/profiles` and were readable by
 * anyone with the URL. They are now private, so they need a route that checks
 * the session. Callers cache-bust with a `?v=` parameter, which is ignored here.
 */
export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { profilePictureUrl: true }
  });

  if (!user?.profilePictureUrl) {
    return NextResponse.json({ error: 'No profile picture set.' }, { status: 404 });
  }

  const filePath = await resolveUploadPath(user.profilePictureUrl);

  if (!filePath) {
    return NextResponse.json({ error: 'Profile picture is missing from storage.' }, { status: 404 });
  }

  const file = await fs.readFile(filePath);
  const extension = path.extname(filePath).toLowerCase();
  const contentType = SERVE_CONTENT_TYPES[extension] ?? 'application/octet-stream';

  // Only ever serve these as images; never as anything the browser would run.
  if (!contentType.startsWith('image/')) {
    return NextResponse.json({ error: 'Stored file is not an image.' }, { status: 415 });
  }

  return new NextResponse(file, {
    headers: {
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Cache-Control': 'private, max-age=3600'
    }
  });
}
