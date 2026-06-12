import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session || !['ADMIN', 'REVIEWER'].includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const body = await request.json();
  const { requestId } = body;

  if (!requestId) {
    return NextResponse.json({ error: 'Request ID is required.' }, { status: 422 });
  }

  const existing = await prisma.activityRequest.findUnique({ where: { id: requestId } });

  if (!existing) {
    return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
  }

  if (existing.status !== 'APPROVED') {
    return NextResponse.json({ error: 'Only requests for voucher can be marked done.' }, { status: 400 });
  }

  await prisma.activityRequest.update({
    where: { id: requestId },
    data: { status: 'DONE' }
  });

  await prisma.requestApproval.create({
    data: {
      requestId,
      actorId: session.id,
      role: session.role,
      action: 'VOUCHER_DONE',
      remarks: 'Voucher printing marked as done.'
    }
  });

  await prisma.auditLog.create({
    data: {
      requestId,
      userId: session.id,
      action: 'VOUCHER_DONE',
      details: 'Voucher printing marked as done.'
    }
  });

  return NextResponse.json({ message: 'Request marked as done.' });
}
