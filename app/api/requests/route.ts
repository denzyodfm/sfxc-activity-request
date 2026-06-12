import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { MAX_UPLOAD_SIZE_BYTES, MAX_UPLOAD_SIZE_LABEL } from '@/lib/upload-limits';

async function saveRequestAttachment(requestId: string, file: File, prefix?: string) {
  const safeName = path.basename(file.name.replace(/[^a-zA-Z0-9._-]/g, '_'));
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  await fs.mkdir(uploadDir, { recursive: true });
  const fileName = `${Date.now()}-${prefix ? `${prefix}-` : ''}${safeName}`;
  const targetPath = path.join(uploadDir, fileName);
  const fileData = await file.arrayBuffer();
  await fs.writeFile(targetPath, new Uint8Array(fileData));

  await prisma.requestAttachment.create({
    data: {
      requestId,
      fileName: prefix === 'pre-approval' ? `Pre-Approval Notes - ${safeName}` : safeName,
      fileUrl: `/uploads/${fileName}`
    }
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session || !['REQUESTOR', 'ADMIN'].includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const formData = await request.formData();
  const particulars = formData.get('particulars')?.toString().trim() ?? '';
  const amount = Number(formData.get('amount')?.toString() ?? 0);
  const preApprovalFile = formData.get('preApprovalFile') as File | null;
  const attachments = formData.getAll('attachments').filter((item): item is File => item instanceof File && Boolean(item.name));

  if (!particulars || !amount) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 422 });
  }

  if (preApprovalFile && preApprovalFile.name) {
    const isAllowedFile = preApprovalFile.type.startsWith('image/') || preApprovalFile.type === 'application/pdf';
    if (!isAllowedFile) {
      return NextResponse.json({ error: 'Pre-approval notes must be an image or PDF file.' }, { status: 422 });
    }

    if (preApprovalFile.size > MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json({ error: `Pre-approval notes must not exceed ${MAX_UPLOAD_SIZE_LABEL}.` }, { status: 422 });
    }
  }

  const oversizedAttachment = attachments.find((attachment) => attachment.size > MAX_UPLOAD_SIZE_BYTES);
  if (oversizedAttachment) {
    return NextResponse.json({ error: `Attachment ${oversizedAttachment.name} must not exceed ${MAX_UPLOAD_SIZE_LABEL}.` }, { status: 422 });
  }

  const department = await prisma.department.findFirst({
    where: { headId: session.id },
    select: { id: true }
  });

  if (!department) {
    return NextResponse.json({ error: 'Your account is not assigned to a department.' }, { status: 422 });
  }

  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const countToday = await prisma.activityRequest.count({
    where: { date: { gte: start, lte: end } }
  });
  const controlNumber = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-SFXC-${String(countToday + 1).padStart(5, '0')}`;

  const activityRequest = await prisma.activityRequest.create({
    data: {
      controlNumber,
      date: now,
      departmentId: department.id,
      requestedById: session.id,
      particulars,
      amount: Number(amount),
      status: 'FOR_FUND_AVAILABILITY'
    }
  });

  if (preApprovalFile && preApprovalFile.name) {
    await saveRequestAttachment(activityRequest.id, preApprovalFile, 'pre-approval');
  }

  for (const attachment of attachments) {
    await saveRequestAttachment(activityRequest.id, attachment);
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

  return NextResponse.json({ id: activityRequest.id, controlNumber });
}

export async function GET() {
  const session = await getSession();
  let whereClause: any = {};

  if (session?.role === 'REQUESTOR') {
    const department = await prisma.department.findFirst({
      where: { headId: session.id },
      select: { id: true }
    });

    whereClause = department ? { departmentId: department.id } : { requestedById: session.id };
  }

  const requests = await prisma.activityRequest.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    include: { department: true, requestedBy: true }
  });

  return NextResponse.json(requests);
}
