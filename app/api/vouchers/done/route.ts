import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { spendFromFund, lockFundSource } from '@/lib/fund-ledger';
import { formatMoney } from '@/lib/money';

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

  // The status re-check, the balance check, and the ledger write all happen
  // inside one transaction. Previously the balance was checked outside it, so
  // two people completing different vouchers against the same fund at the same
  // moment could both pass the check and overdraw it. The status is re-read
  // under the lock for the same reason — it stops the same voucher being
  // completed twice concurrently and deducting the amount twice.
  const outcome = await prisma.$transaction(async (tx) => {
    // Take the fund lock before re-reading the status, so two completions
    // against the same fund serialise here rather than both seeing APPROVED.
    if (existing.fundSourceId) {
      await lockFundSource(existing.fundSourceId, tx);
    }

    const stillApproved = await tx.activityRequest.findUnique({
      where: { id: requestId },
      select: { status: true }
    });

    if (stillApproved?.status !== 'APPROVED') {
      return { error: 'This request was already completed.', status: 409 as const };
    }

    if (existing.fundSourceId) {
      const result = await spendFromFund(
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

      if (!result.ok) {
        return {
          error: `${existing.fundSource?.name ?? 'The selected fund'} has ${formatMoney(result.balance)} available, which is short of the ${formatMoney(result.required)} this request needs.`,
          status: 422 as const
        };
      }
    }

    await tx.activityRequest.update({
      where: { id: requestId },
      data: { status: 'COMPLETED' }
    });

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

    return { error: null };
  });

  if (outcome.error) {
    return NextResponse.json({ error: outcome.error }, { status: outcome.status });
  }

  return NextResponse.json({ message: 'Request marked as completed.' });
}
