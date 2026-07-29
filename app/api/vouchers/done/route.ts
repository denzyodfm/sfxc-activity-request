import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { createFundLedgerEntry, getFundSourceBalance } from '@/lib/fund-ledger';

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session || !['ADMIN', 'REVIEWER', 'FUND_OFFICER'].includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const body = await request.json();
  const { requestId } = body;

  if (!requestId) {
    return NextResponse.json({ error: 'Request ID is required.' }, { status: 422 });
  }

  const existing = await prisma.activityRequest.findUnique({
    where: { id: requestId },
    include: { fundSource: true }
  });

  if (!existing) {
    return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
  }

  if (existing.status !== 'APPROVED') {
    return NextResponse.json({ error: 'Only requests for voucher can be marked completed.' }, { status: 400 });
  }

  if (existing.fundSourceId) {
    const balance = await getFundSourceBalance(existing.fundSourceId);
    if (balance < Number(existing.amount)) {
      return NextResponse.json({ error: 'Selected source of fund does not have enough balance to complete this request.' }, { status: 422 });
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.activityRequest.update({
      where: { id: requestId },
      data: { status: 'COMPLETED' }
    });

    if (existing.fundSourceId) {
      const existingLedgerEntry = await tx.fundLedgerEntry.findFirst({
        where: {
          requestId,
          type: 'REQUEST_COMPLETION'
        }
      });

      if (!existingLedgerEntry) {
        await createFundLedgerEntry(
          {
            fundSourceId: existing.fundSourceId,
            requestId,
            actorId: session.id,
            type: 'REQUEST_COMPLETION',
            description: `Completed request ${existing.controlNumber}`,
            credit: Number(existing.amount)
          },
          tx
        );
      }
    }

    await tx.requestApproval.create({
      data: {
        requestId,
        actorId: session.id,
        role: session.role,
        action: 'VOUCHER_COMPLETED',
        remarks: 'Voucher marked as completed.'
      }
    });

    await tx.auditLog.create({
      data: {
        requestId,
        userId: session.id,
        action: 'VOUCHER_COMPLETED',
        details: existing.fundSource
          ? `Voucher marked as completed and deducted from ${existing.fundSource.name}.`
          : 'Voucher marked as completed.'
      }
    });
  });

  return NextResponse.json({ message: 'Request marked as completed.' });
}
