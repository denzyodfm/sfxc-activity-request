import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { requestId, fundSourceId, fundAvailable, remarks } = body;

  if (!requestId || fundAvailable === undefined) {
    return NextResponse.json({ error: 'Missing request information.' }, { status: 422 });
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
      actorId: updated.requestedById,
      role: 'FUND_OFFICER',
      action,
      remarks
    }
  });

  await prisma.auditLog.create({
    data: {
      requestId,
      action,
      details: `Fund availability marked as ${fundAvailable ? 'available' : 'not available'}`
    }
  });

  return NextResponse.json({ message: `Request status updated to ${status}.` });
}
