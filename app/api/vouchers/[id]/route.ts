import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { recordActivity } from '@/lib/activity-log';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || !['ADMIN', 'FUND_OFFICER'].includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const existing = await prisma.activityRequest.findUnique({
    where: { id: params.id },
    select: { id: true, status: true, controlNumber: true }
  });
  if (!existing) return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
  if (!['FOR_FUND_AVAILABILITY', 'APPROVED'].includes(existing.status)) {
    return NextResponse.json({ error: 'Voucher details can only be edited during fund availability or voucher preparation.' }, { status: 422 });
  }

  const body = await request.json();
  const voucherPayTo = body.voucherPayTo?.toString().trim();
  const voucherAddress = body.voucherAddress?.toString().trim();
  const voucherNumber = body.voucherNumber?.toString().trim();
  const voucherParticulars = body.voucherParticulars?.toString().trim();
  const fundSourceId = body.fundSourceId?.toString().trim() || null;
  if (!voucherPayTo || !voucherAddress || !voucherNumber || !voucherParticulars) {
    return NextResponse.json({ error: 'Pay to, address, voucher number, and particulars are required.' }, { status: 422 });
  }
  if (existing.status === 'FOR_FUND_AVAILABILITY') {
    if (!fundSourceId) {
      return NextResponse.json({ error: 'Please select a voucher sub-account.' }, { status: 422 });
    }
    const fundSource = await prisma.fundSource.findUnique({
      where: { id: fundSourceId },
      select: { parentId: true }
    });
    if (!fundSource?.parentId) {
      return NextResponse.json({ error: 'The voucher account must be a sub-account.' }, { status: 422 });
    }
  }

  const updated = await prisma.activityRequest.update({
    where: { id: existing.id },
    data: {
      voucherPayTo,
      voucherAddress,
      voucherNumber,
      voucherParticulars,
      ...(existing.status === 'FOR_FUND_AVAILABILITY' ? { fundSourceId } : {})
    }
  });
  await recordActivity({
    userId: session.id,
    requestId: existing.id,
    action: 'VOUCHER_DETAILS_UPDATED',
    details: `Prepared voucher details for ${existing.controlNumber}.`
  });
  return NextResponse.json({ request: updated, message: 'Voucher details saved.' });
}
