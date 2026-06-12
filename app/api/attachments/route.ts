import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { MAX_UPLOAD_SIZE_BYTES, MAX_UPLOAD_SIZE_LABEL } from '@/lib/upload-limits';

async function saveAttachment(requestId: string, attachment: File) {
  const safeName = path.basename(attachment.name.replace(/[^a-zA-Z0-9._-]/g, '_'));
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  await fs.mkdir(uploadDir, { recursive: true });
  const fileName = `${Date.now()}-${safeName}`;
  const targetPath = path.join(uploadDir, fileName);
  const fileData = await attachment.arrayBuffer();
  await fs.writeFile(targetPath, new Uint8Array(fileData));

  const fileUrl = `/uploads/${fileName}`;

  await prisma.requestAttachment.create({
    data: {
      requestId,
      fileName: safeName,
      fileUrl
    }
  });

  return safeName;
}

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const formData = await request.formData();
  const requestId = formData.get('requestId')?.toString();
  const remarks = formData.get('remarks')?.toString() ?? '';
  const attachments = formData.getAll('attachment').filter((item): item is File => item instanceof File && Boolean(item.name));

  if (!requestId || attachments.length === 0) {
    return NextResponse.json({ error: 'Missing request ID or file.' }, { status: 422 });
  }

  const oversizedAttachment = attachments.find((attachment) => attachment.size > MAX_UPLOAD_SIZE_BYTES);
  if (oversizedAttachment) {
    return NextResponse.json({ error: `Attachment ${oversizedAttachment.name} must not exceed ${MAX_UPLOAD_SIZE_LABEL}.` }, { status: 422 });
  }

  const targetRequest = await prisma.activityRequest.findUnique({
    where: { id: requestId },
    select: { id: true, requestedById: true, departmentId: true }
  });

  if (!targetRequest) {
    return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
  }

  if (session.role === 'REQUESTOR') {
    const canAttach = targetRequest.requestedById === session.id || targetRequest.departmentId === session.departmentId;

    if (!canAttach) {
      return NextResponse.json({ error: 'You can only add attachments to your assigned department requests.' }, { status: 403 });
    }
  }

  const uploadedNames = [];
  for (const attachment of attachments) {
    uploadedNames.push(await saveAttachment(requestId, attachment));
  }

  await prisma.auditLog.create({
    data: {
      requestId,
      userId: session.id,
      action: 'ATTACHMENT_UPLOADED',
      details: remarks ? `Uploaded ${uploadedNames.join(', ')}: ${remarks}` : `Uploaded ${uploadedNames.join(', ')}`
    }
  });

  return NextResponse.json({ message: 'Attachments saved.' });
}
