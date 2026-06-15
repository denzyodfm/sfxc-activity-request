import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

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

  const approved = decision === 'approve';
  const status = approved ? 'APPROVED' : 'DENIED';
  const action = approved ? 'APPROVED' : 'DENIED';

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

  await prisma.activityRequest.update({
    where: { id: requestId },
    data: {
      approvalRemarks: remarks,
      status,
      approvedById: approved ? approver?.id ?? null : null
    }
  });

  await prisma.requestApproval.create({
    data: {
      requestId,
      actorId: approver?.id ?? existing.requestedById,
      role: session.role === 'ADMIN' ? existing.finalApprover ?? 'ADMIN' : session.role,
      action,
      remarks
    }
  });

  await prisma.auditLog.create({
    data: {
      requestId,
      userId: session.id,
      action,
      details: `Final approval: ${approved ? 'approved' : 'denied'}`
    }
  });

  return NextResponse.json({ message: `Request has been ${approved ? 'approved' : 'denied'}.` });
}
