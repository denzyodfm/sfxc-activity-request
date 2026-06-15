import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { createFundLedgerEntry } from '@/lib/fund-ledger';

function canManageFunds(role: string) {
  return ['ADMIN', 'FUND_OFFICER'].includes(role);
}

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session || !canManageFunds(session.role)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const body = await request.json();
  const fundSourceId = body.fundSourceId?.toString();
  const amount = Number(body.amount);
  const depositDateValue = body.depositDate?.toString();
  const reference = body.reference?.toString().trim() || null;
  const description = body.description?.toString().trim() || 'Deposit to source of fund.';

  if (!fundSourceId) {
    return NextResponse.json({ error: 'Source of fund is required.' }, { status: 422 });
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Deposit amount must be greater than zero.' }, { status: 422 });
  }

  if (!depositDateValue) {
    return NextResponse.json({ error: 'Deposit date is required.' }, { status: 422 });
  }

  const depositDate = new Date(depositDateValue);
  if (Number.isNaN(depositDate.getTime())) {
    return NextResponse.json({ error: 'Deposit date is invalid.' }, { status: 422 });
  }

  const fundSource = await prisma.fundSource.findUnique({ where: { id: fundSourceId } });
  if (!fundSource) {
    return NextResponse.json({ error: 'Source of fund not found.' }, { status: 404 });
  }

  const entry = await createFundLedgerEntry({
    fundSourceId,
    actorId: session.id,
    type: 'DEPOSIT',
    description,
    reference,
    transactionDate: depositDate,
    debit: amount
  });

  return NextResponse.json({ entry, message: 'Deposit posted to ledger.' });
}
