import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { generateApprovalCode } from '@/lib/approval-code';

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session || !['ENDORSER', 'ADMIN'].includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const body = await request.json();
  const { requestId, approver, remarks } = body;

  if (!requestId || !approver) {
    return NextResponse.json({ error: 'Request ID and approver selection are required.' }, { status: 422 });
  }

  const existing = await prisma.activityRequest.findUnique({
    where: { id: requestId },
    select: { status: true }
  });

  if (!existing) {
    return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
  }

  if (existing.status !== 'FOR_ENDORSEMENT') {
    return NextResponse.json({ error: 'This request is already past endorsement.' }, { status: 400 });
  }

  const approvedAt = new Date();
  const approvalCode = generateApprovalCode({
    requestId,
    actorId: session.id,
    role: 'ENDORSER',
    action: 'ENDORSED',
    approvedAt
  });

  await prisma.activityRequest.update({
    where: { id: requestId },
    data: {
      finalApprover: approver,
      endorsementRemarks: remarks,
      status: 'FOR_APPROVAL'
    }
  });

  await prisma.requestApproval.create({
    data: {
      requestId,
      actorId: session.id,
      role: 'ENDORSER',
      action: 'ENDORSED',
      approvalCode,
      remarks,
      createdAt: approvedAt
    }
  });

  await prisma.auditLog.create({
    data: {
      requestId,
      userId: session.id,
      action: 'ENDORSED',
      details: `Endorsed for ${approver === 'APPROVER_JMAPC' ? 'JMAPC' : 'JCA'}.`
    }
  });

  return NextResponse.json({ message: 'Request endorsed and sent to final approval.' });
}
