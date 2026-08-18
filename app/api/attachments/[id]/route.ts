import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { recordActivity } from '@/lib/activity-log';
import { resolveUploadPath, SERVE_CONTENT_TYPES } from '@/lib/uploads';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const attachment = await prisma.requestAttachment.findUnique({
    where: { id: params.id },
    select: {
      fileName: true,
      fileUrl: true,
      requestId: true,
      request: {
        select: {
          departmentId: true,
          requestedById: true
        }
      }
    }
  });

  if (!attachment) {
    return NextResponse.json({ error: 'Attachment not found.' }, { status: 404 });
  }

  if (
    session.role === 'REQUESTOR' &&
    attachment.request.requestedById !== session.id &&
    attachment.request.departmentId !== session.departmentId
  ) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const filePath = await resolveUploadPath(attachment.fileUrl);

  if (!filePath) {
    return NextResponse.json({ error: 'The attachment file is missing from storage.' }, { status: 404 });
  }

  const file = await fs.readFile(filePath);
  const extension = path.extname(filePath).toLowerCase();
  const encodedName = encodeURIComponent(attachment.fileName);
  const contentType = SERVE_CONTENT_TYPES[extension] ?? 'application/octet-stream';

  // Office documents and unknown types download rather than render, so the
  // browser never tries to interpret an uploaded file as a page.
  const disposition = contentType.startsWith('image/') || contentType === 'application/pdf'
    ? 'inline'
    : 'attachment';

  await recordActivity({
    userId: session.id,
    requestId: attachment.requestId,
    action: 'ATTACHMENT_VIEWED',
    details: `Viewed attachment: ${attachment.fileName}.`
  });

  return new NextResponse(file, {
    headers: {
      'Content-Disposition': `${disposition}; filename*=UTF-8''${encodedName}`,
      'Content-Type': contentType,
      // Stops the browser second-guessing the declared type.
      'X-Content-Type-Options': 'nosniff',
      // Neutralises any active content the file might carry.
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Cache-Control': 'private, max-age=3600'
    }
  });
}
