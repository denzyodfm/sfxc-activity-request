import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { generateApprovalCode } from '@/lib/approval-code';

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session || !['REVIEWER', 'ADMIN'].includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const body = await request.json();
  const { requestId, decision, remarks } = body;

  if (!requestId || !decision) {
    return NextResponse.json({ error: 'Request ID and decision are required.' }, { status: 422 });
  }

  const approved = decision === 'approve';
  const status = approved ? 'FOR_ENDORSEMENT' : 'DENIED';
  const action = approved ? 'REVIEW_APPROVED' : 'REVIEW_DENIED';

  const existing = await prisma.activityRequest.findUnique({
    where: { id: requestId },
    select: { status: true }
  });

  if (!existing) {
    return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
  }

  if (existing.status !== 'FOR_REVIEW') {
    return NextResponse.json({ error: 'This request is already past review.' }, { status: 400 });
  }

  const approvedAt = new Date();
  const approvalCode = generateApprovalCode({
    requestId,
    actorId: session.id,
    role: 'REVIEWER',
    action,
    approvedAt
  });

  await prisma.activityRequest.update({
    where: { id: requestId },
    data: {
      reviewRemarks: remarks,
      status
    }
  });

  await prisma.requestApproval.create({
    data: {
      requestId,
      actorId: session.id,
      role: 'REVIEWER',
      action,
      approvalCode,
      remarks,
      createdAt: approvedAt
    }
  });

  await prisma.auditLog.create({
    data: {
      requestId,
      userId: session.id,
      action,
      details: `Review decision recorded: ${approved ? 'approved' : 'denied'}`
    }
  });

  return NextResponse.json({ message: `Request marked ${approved ? 'for endorsement' : 'denied'}.` });
}
