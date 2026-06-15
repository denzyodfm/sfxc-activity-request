import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getFundSourceBalance } from '@/lib/fund-ledger';

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session || !['ADMIN', 'FUND_OFFICER'].includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const body = await request.json();
  const { requestId, fundSourceId, fundAvailable, remarks } = body;

  if (!requestId || fundAvailable === undefined) {
    return NextResponse.json({ error: 'Missing request information.' }, { status: 422 });
  }

  if (fundAvailable && !fundSourceId) {
    return NextResponse.json({ error: 'Source of fund is required when funds are available.' }, { status: 422 });
  }

  const existing = await prisma.activityRequest.findUnique({
    where: { id: requestId },
    select: { amount: true }
  });

  if (!existing) {
    return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
  }

  if (fundAvailable && fundSourceId) {
    const balance = await getFundSourceBalance(fundSourceId);
    if (balance < Number(existing.amount)) {
      return NextResponse.json({ error: 'Selected source of fund does not have enough balance.' }, { status: 422 });
    }
  }

  const action = fundAvailable ? 'FUND_AVAILABLE' : 'FUND_NOT_AVAILABLE';
  const status = fundAvailable ? 'FOR_REVIEW' : 'DENIED';

  const updated = await prisma.activityRequest.update({
    where: { id: requestId },
    data: {
      fundSourceId,
      fundAvailable,
      fundAvailabilityRemarks: remarks,
      status
    }
  });

  await prisma.requestApproval.create({
    data: {
      requestId,
      actorId: session.id,
      role: 'FUND_OFFICER',
      action,
      remarks
    }
  });

  await prisma.auditLog.create({
    data: {
      requestId,
      userId: session.id,
      action,
      details: `Fund availability marked as ${fundAvailable ? 'available' : 'not available'}`
    }
  });

  return NextResponse.json({ message: `Request status updated to ${status}.` });
}
