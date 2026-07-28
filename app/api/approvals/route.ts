import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { generateApprovalCode } from '@/lib/approval-code';

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session || !['APPROVER_JMAPC', 'APPROVER_JCA', 'ADMIN'].includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const body = await request.json();
  const { requestId, decision, remarks } = body;

  if (!requestId || !decision) {
    return NextResponse.json({ error: 'Request ID and decision are required.' }, { status: 422 });
  }

  if (!['approve', 'return', 'deny'].includes(decision)) {
    return NextResponse.json({ error: 'Invalid approval decision.' }, { status: 422 });
  }

  if (decision === 'return' && !remarks?.trim()) {
    return NextResponse.json({ error: 'Remarks are required when sending a request back.' }, { status: 422 });
  }

  const approved = decision === 'approve';
  const returned = decision === 'return';
  const status = approved ? 'APPROVED' : returned ? 'FOR_ENDORSEMENT' : 'DENIED';
  const action = approved ? 'APPROVED' : returned ? 'APPROVAL_RETURNED' : 'DENIED';

  const existing = await prisma.activityRequest.findUnique({ where: { id: requestId } });
  if (!existing) {
    return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
  }

  if (existing.status !== 'FOR_APPROVAL') {
    return NextResponse.json({ error: 'This request is already past final approval.' }, { status: 400 });
  }

  if (session.role !== 'ADMIN' && existing.finalApprover && session.role !== existing.finalApprover) {
    return NextResponse.json({ error: 'This request is assigned to a different approver.' }, { status: 403 });
  }

  const approver = await prisma.user.findUnique({ where: { id: session.id } });
  const actorId = approver?.id ?? existing.requestedById;
  const role = session.role === 'ADMIN' ? existing.finalApprover ?? 'ADMIN' : session.role;
  const approvedAt = new Date();
  const approvalCode = generateApprovalCode({
    requestId,
    actorId,
    role,
    action,
    approvedAt
  });

  await prisma.activityRequest.update({
    where: { id: requestId },
    data: {
      approvalRemarks: remarks,
      status,
      approvedById: approved ? approver?.id ?? null : null,
      finalApprover: returned ? null : existing.finalApprover
    }
  });

  await prisma.requestApproval.create({
    data: {
      requestId,
      actorId,
      role,
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
      details: `Final approval: ${approved ? 'approved' : returned ? 'sent back to endorser' : 'denied'}`
    }
  });

  return NextResponse.json({
    message: returned
      ? 'Request sent back to the endorser.'
      : `Request has been ${approved ? 'approved' : 'denied'}.`,
    approvalCode,
    approvedAt: approvedAt.toISOString()
  });
}
