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
  const { requestId, decision = 'endorse', approver, remarks } = body;

  if (!requestId || (decision === 'endorse' && !approver)) {
    return NextResponse.json({ error: 'Request ID and approver selection are required.' }, { status: 422 });
  }

  if (!['endorse', 'return'].includes(decision)) {
    return NextResponse.json({ error: 'Invalid endorsement decision.' }, { status: 422 });
  }

  if (decision === 'return' && !remarks?.trim()) {
    return NextResponse.json({ error: 'Remarks are required when sending a request back.' }, { status: 422 });
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

  const returned = decision === 'return';
  const action = returned ? 'ENDORSEMENT_RETURNED' : 'ENDORSED';
  const approvedAt = new Date();
  const approvalCode = generateApprovalCode({
    requestId,
    actorId: session.id,
    role: 'ENDORSER',
    action,
    approvedAt
  });

  await prisma.activityRequest.update({
    where: { id: requestId },
    data: {
      finalApprover: returned ? null : approver,
      endorsementRemarks: remarks,
      status: returned ? 'FOR_REVIEW' : 'FOR_APPROVAL'
    }
  });

  await prisma.requestApproval.create({
    data: {
      requestId,
      actorId: session.id,
      role: 'ENDORSER',
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
      details: returned
        ? 'Sent back to reviewer for corrections.'
        : `Endorsed for ${approver === 'APPROVER_JMAPC' ? 'JMAPC' : 'JCA'}.`
    }
  });

  return NextResponse.json({
    message: returned
      ? 'Request sent back to the reviewer.'
      : 'Request endorsed and sent to final approval.',
    approvalCode,
    approvedAt: approvedAt.toISOString()
  });
}
