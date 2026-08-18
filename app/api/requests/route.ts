import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { MAX_UPLOAD_SIZE_BYTES, MAX_UPLOAD_SIZE_LABEL } from '@/lib/upload-limits';
import { saveUpload, validateUpload } from '@/lib/uploads';
import { parseAmount } from '@/lib/money';

const MAX_ATTACHMENTS = 10;
const MAX_PARTICULARS_LENGTH = 2000;

/** Builds the next control number for today, e.g. 20260818-SFXC-00003. */
async function nextControlNumber(now: Date) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const countToday = await prisma.activityRequest.count({
    where: { date: { gte: start, lte: end } }
  });

  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

  return `${datePart}-SFXC-${String(countToday + 1).padStart(5, '0')}`;
}

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session || !['REQUESTOR', 'ADMIN'].includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const formData = await request.formData();
  const particulars = formData.get('particulars')?.toString().trim() ?? '';
  const preApprovalFile = formData.get('preApprovalFile') as File | null;
  const attachments = formData
    .getAll('attachments')
    .filter((item): item is File => item instanceof File && Boolean(item.name));

  if (!particulars) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 422 });
  }

  if (particulars.length > MAX_PARTICULARS_LENGTH) {
    return NextResponse.json(
      { error: `Particulars must be ${MAX_PARTICULARS_LENGTH} characters or fewer.` },
      { status: 422 }
    );
  }

  const parsedAmount = parseAmount(formData.get('amount')?.toString());
  if ('error' in parsedAmount) {
    return NextResponse.json({ error: parsedAmount.error }, { status: 422 });
  }

  if (attachments.length > MAX_ATTACHMENTS) {
    return NextResponse.json(
      { error: `You can attach at most ${MAX_ATTACHMENTS} files.` },
      { status: 422 }
    );
  }

  if (!session.departmentId) {
    return NextResponse.json({ error: 'Your account is not assigned to a department.' }, { status: 422 });
  }

  // Validate every file up front so nothing is stored if one is rejected.
  const pending: { bytes: Uint8Array; name: string; prefix?: string }[] = [];

  if (preApprovalFile && preApprovalFile.name) {
    if (preApprovalFile.size > MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Pre-approval notes must not exceed ${MAX_UPLOAD_SIZE_LABEL}.` },
        { status: 422 }
      );
    }

    const bytes = new Uint8Array(await preApprovalFile.arrayBuffer());
    const extension = path.extname(preApprovalFile.name).toLowerCase();
    const error = validateUpload(extension, preApprovalFile.type, bytes);

    if (error) {
      return NextResponse.json({ error: `Pre-approval notes: ${error}` }, { status: 422 });
    }

    pending.push({ bytes, name: preApprovalFile.name, prefix: 'pre-approval' });
  }

  for (const attachment of attachments) {
    if (attachment.size > MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Attachment ${attachment.name} must not exceed ${MAX_UPLOAD_SIZE_LABEL}.` },
        { status: 422 }
      );
    }

    const bytes = new Uint8Array(await attachment.arrayBuffer());
    const extension = path.extname(attachment.name).toLowerCase();
    const error = validateUpload(extension, attachment.type, bytes);

    if (error) {
      return NextResponse.json({ error: `${attachment.name}: ${error}` }, { status: 422 });
    }

    pending.push({ bytes, name: attachment.name });
  }

  const now = new Date();

  // The control number is derived from a count, so two simultaneous submissions
  // can compute the same one. The unique constraint catches that; retrying
  // recomputes the count and takes the next number instead of failing with a 500.
  let activityRequest = null;

  for (let attempt = 0; attempt < 5 && !activityRequest; attempt += 1) {
    try {
      activityRequest = await prisma.activityRequest.create({
        data: {
          controlNumber: await nextControlNumber(now),
          date: now,
          departmentId: session.departmentId,
          requestedById: session.id,
          particulars,
          amount: parsedAmount.amount,
          status: 'FOR_FUND_AVAILABILITY'
        }
      });
    } catch (error) {
      const isDuplicate =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

      if (!isDuplicate || attempt === 4) {
        throw error;
      }
    }
  }

  if (!activityRequest) {
    return NextResponse.json(
      { error: 'Could not allocate a control number. Please try again.' },
      { status: 409 }
    );
  }

  for (const file of pending) {
    const saved = await saveUpload(file.bytes, file.name, { prefix: file.prefix });

    await prisma.requestAttachment.create({
      data: {
        requestId: activityRequest.id,
        fileName:
          file.prefix === 'pre-approval'
            ? `Pre-Approval Notes - ${saved.displayName}`
            : saved.displayName,
        fileUrl: saved.storageKey
      }
    });
  }

  await prisma.requestApproval.create({
    data: {
      requestId: activityRequest.id,
      actorId: session.id,
      role: 'REQUESTOR',
      action: 'CREATED',
      remarks: 'Created request and submitted for fund availability.'
    }
  });

  await prisma.auditLog.create({
    data: {
      requestId: activityRequest.id,
      userId: session.id,
      action: 'CREATE_REQUEST',
      details: `Request submitted with status FOR_FUND_AVAILABILITY.`
    }
  });

  return NextResponse.json({ id: activityRequest.id, controlNumber: activityRequest.controlNumber });
}

export async function GET() {
  const session = await getSession();

  // Previously this fell through to an unfiltered query when there was no
  // session, returning every request in the system to anonymous callers.
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const whereClause =
    session.role === 'REQUESTOR'
      ? session.departmentId
        ? { departmentId: session.departmentId }
        : { requestedById: session.id }
      : {};

  const requests = await prisma.activityRequest.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    include: {
      department: { select: { id: true, name: true } },
      requestedBy: { select: { id: true, name: true, email: true } }
    }
  });

  return NextResponse.json(requests);
}
