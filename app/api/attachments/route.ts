import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { MAX_UPLOAD_SIZE_BYTES, MAX_UPLOAD_SIZE_LABEL } from '@/lib/upload-limits';
import { saveUpload, validateUpload } from '@/lib/uploads';

/** Guards against a single request carrying an unbounded number of files. */
const MAX_FILES_PER_REQUEST = 10;

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const formData = await request.formData();
  const requestId = formData.get('requestId')?.toString();
  const remarks = formData.get('remarks')?.toString() ?? '';
  const attachments = formData
    .getAll('attachment')
    .filter((item): item is File => item instanceof File && Boolean(item.name));

  if (!requestId || attachments.length === 0) {
    return NextResponse.json({ error: 'Missing request ID or file.' }, { status: 422 });
  }

  if (attachments.length > MAX_FILES_PER_REQUEST) {
    return NextResponse.json(
      { error: `You can upload at most ${MAX_FILES_PER_REQUEST} files at a time.` },
      { status: 422 }
    );
  }

  const oversizedAttachment = attachments.find((attachment) => attachment.size > MAX_UPLOAD_SIZE_BYTES);
  if (oversizedAttachment) {
    return NextResponse.json(
      { error: `Attachment ${oversizedAttachment.name} must not exceed ${MAX_UPLOAD_SIZE_LABEL}.` },
      { status: 422 }
    );
  }

  const targetRequest = await prisma.activityRequest.findUnique({
    where: { id: requestId },
    select: { id: true, requestedById: true, departmentId: true }
  });

  if (!targetRequest) {
    return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
  }

  if (session.role === 'REQUESTOR') {
    const canAttach =
      targetRequest.requestedById === session.id || targetRequest.departmentId === session.departmentId;

    if (!canAttach) {
      return NextResponse.json(
        { error: 'You can only add attachments to your assigned department requests.' },
        { status: 403 }
      );
    }
  }

  // Read and validate everything before writing anything, so a rejected file
  // part-way through a batch does not leave earlier files stored.
  const validated: { bytes: Uint8Array; name: string }[] = [];

  for (const attachment of attachments) {
    const bytes = new Uint8Array(await attachment.arrayBuffer());
    const extension = path.extname(attachment.name).toLowerCase();
    const error = validateUpload(extension, attachment.type, bytes);

    if (error) {
      return NextResponse.json({ error: `${attachment.name}: ${error}` }, { status: 422 });
    }

    validated.push({ bytes, name: attachment.name });
  }

  const uploadedNames: string[] = [];

  for (const file of validated) {
    const saved = await saveUpload(file.bytes, file.name);

    await prisma.requestAttachment.create({
      data: {
        requestId,
        fileName: saved.displayName,
        fileUrl: saved.storageKey
      }
    });

    uploadedNames.push(saved.displayName);
  }

  await prisma.auditLog.create({
    data: {
      requestId,
      userId: session.id,
      action: 'ATTACHMENT_UPLOADED',
      details: remarks
        ? `Uploaded ${uploadedNames.join(', ')}: ${remarks}`
        : `Uploaded ${uploadedNames.join(', ')}`
    }
  });

  return NextResponse.json({ message: 'Attachments saved.' });
}
