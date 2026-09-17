import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { parseReleaseDate } from '@/lib/release-date';
import { recordActivity } from '@/lib/activity-log';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || !['ADMIN', 'REVIEWER', 'FUND_OFFICER'].includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  let body: { actualReleaseDate?: unknown };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const actualReleaseDate = parseReleaseDate(body.actualReleaseDate);
  if (actualReleaseDate === undefined) {
    return NextResponse.json({ error: 'Enter a valid actual release date in YYYY-MM-DD format.' }, { status: 422 });
  }

  const updated = await prisma.activityRequest.updateMany({
    where: { id: params.id, status: 'APPROVED', scheduledReleaseDate: { not: null } },
    data: { actualReleaseDate }
  });
  if (updated.count === 0) {
    return NextResponse.json({ error: 'Only scheduled vouchers awaiting completion can have an actual release date.' }, { status: 409 });
  }

  await recordActivity({
    userId: session.id,
    requestId: params.id,
    action: 'VOUCHER_ACTUAL_RELEASE_DATE_UPDATED',
    details: actualReleaseDate ? `Funds actually released on ${body.actualReleaseDate}.` : 'Cleared the actual fund release date.'
  });
  return NextResponse.json({ message: 'Actual fund release date saved.' });
}
