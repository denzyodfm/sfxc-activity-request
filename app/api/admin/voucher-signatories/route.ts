import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { recordActivity } from '@/lib/activity-log';

const allowedSlots = [
  'PREPARED_BY',
  'CHECKED_BY',
  'VERIFIED_BY',
  'RECOMMENDING_APPROVAL',
  'APPROVED_BY',
  'PRESIDENT'
];
interface SignatoryInput {
  slot: string;
  name: string;
  title?: string;
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const body = await request.json();
  const signatories: SignatoryInput[] = Array.isArray(body.signatories) ? body.signatories : [];

  if (signatories.some((item) => !allowedSlots.includes(item.slot) || !item.name?.trim())) {
    return NextResponse.json({ error: 'Every voucher signatory must have a valid slot and name.' }, { status: 422 });
  }

  await prisma.$transaction(
    signatories.map((item) =>
      prisma.voucherSignatory.upsert({
        where: { slot: item.slot },
        update: { name: item.name.trim(), title: item.title?.trim() || null },
        create: { slot: item.slot, name: item.name.trim(), title: item.title?.trim() || null }
      })
    )
  );

  await recordActivity({
    userId: session.id,
    action: 'VOUCHER_SIGNATORIES_UPDATED',
    details: 'Updated the configurable voucher signatory table.'
  });

  return NextResponse.json({ message: 'Voucher signatories updated.' });
}
