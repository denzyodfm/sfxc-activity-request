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

  let body: { scheduledReleaseDate?: unknown };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const scheduledReleaseDate = parseReleaseDate(body.scheduledReleaseDate);
  if (scheduledReleaseDate === undefined) {
    return NextResponse.json({ error: 'Enter a valid release date in YYYY-MM-DD format.' }, { status: 422 });
  }

  const updated = await prisma.activityRequest.updateMany({
    where: { id: params.id, status: 'APPROVED' },
    data: { scheduledReleaseDate }
  });
  if (updated.count === 0) {
    return NextResponse.json({ error: 'Only vouchers awaiting completion can have their release date changed.' }, { status: 409 });
  }

  await recordActivity({
    userId: session.id,
    requestId: params.id,
    action: 'VOUCHER_RELEASE_DATE_UPDATED',
    details: scheduledReleaseDate ? `Scheduled fund release for ${body.scheduledReleaseDate}.` : 'Cleared the scheduled fund release date.'
  });
  return NextResponse.json({ message: 'Scheduled release date saved.' });
}
