import prisma from '@/lib/prisma';

type LedgerClient = Pick<typeof prisma, 'fundLedgerEntry'>;

interface CreateFundLedgerEntryInput {
  fundSourceId: string;
  requestId?: string;
  actorId?: string;
  type: string;
  description: string;
  reference?: string;
  transactionDate?: Date;
  debit?: number;
  credit?: number;
}

export async function getFundSourceBalance(fundSourceId: string, client: LedgerClient = prisma) {
  const latestEntry = await client.fundLedgerEntry.findFirst({
    where: { fundSourceId },
    orderBy: { createdAt: 'desc' },
    select: { balanceAfter: true }
  });

  return Number(latestEntry?.balanceAfter ?? 0);
}

export async function createFundLedgerEntry(input: CreateFundLedgerEntryInput, client: LedgerClient = prisma) {
  const debit = input.debit ?? 0;
  const credit = input.credit ?? 0;
  const previousBalance = await getFundSourceBalance(input.fundSourceId, client);
  const balanceAfter = previousBalance + debit - credit;

  return client.fundLedgerEntry.create({
    data: {
      fundSourceId: input.fundSourceId,
      requestId: input.requestId,
      actorId: input.actorId,
      type: input.type,
      description: input.description,
      reference: input.reference,
      transactionDate: input.transactionDate,
      debit,
      credit,
      balanceAfter
    }
  });
}
