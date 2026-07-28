import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { recordActivity } from '@/lib/activity-log';

const contentTypes: Record<string, string> = {
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.webp': 'image/webp'
};

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

  const storedName = path.basename(attachment.fileUrl);
  const filePath = path.join(process.cwd(), 'public', 'uploads', storedName);

  try {
    const file = await fs.readFile(filePath);
    const extension = path.extname(storedName).toLowerCase();
    const encodedName = encodeURIComponent(attachment.fileName);

    await recordActivity({
      userId: session.id,
      requestId: attachment.requestId,
      action: 'ATTACHMENT_VIEWED',
      details: `Viewed attachment: ${attachment.fileName}.`
    });

    return new NextResponse(file, {
      headers: {
        'Content-Disposition': `inline; filename*=UTF-8''${encodedName}`,
        'Content-Type': contentTypes[extension] ?? 'application/octet-stream',
        'Cache-Control': 'private, max-age=3600'
      }
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json({ error: 'The attachment file is missing from storage.' }, { status: 404 });
    }

    throw error;
  }
}
