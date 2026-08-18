import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

/**
 * Fund ledger.
 *
 * Two changes make this safe against concurrent writers:
 *
 * 1. The balance is the sum of every debit minus every credit, rather than the
 *    `balanceAfter` of whichever row happens to sort last. Two entries written
 *    in the same millisecond have no reliable order, so the old read could
 *    return either one. A sum has no such ambiguity, and it self-heals if a
 *    stored `balanceAfter` is ever wrong. That column is still written, as a
 *    record of the balance at the time of the entry.
 *
 * 2. Writes take a row lock on the fund source first. Without it, two
 *    completions could both read the same balance, both decide there is enough
 *    money, and both post — overdrawing the fund.
 */

type LedgerClient = Prisma.TransactionClient | typeof prisma;

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
  const totals = await client.fundLedgerEntry.aggregate({
    where: { fundSourceId },
    _sum: { debit: true, credit: true }
  });

  return Number(totals._sum.debit ?? 0) - Number(totals._sum.credit ?? 0);
}

/**
 * Takes an exclusive lock on a fund source row for the rest of the transaction,
 * so concurrent ledger writes against the same fund queue up instead of
 * interleaving.
 *
 * Only meaningful inside a transaction — MySQL releases the lock at commit. On
 * the bare client the statement runs in its own autocommit transaction and the
 * lock is dropped immediately, which is why the callers below always pass `tx`.
 */
export async function lockFundSource(fundSourceId: string, client: LedgerClient) {
  await client.$queryRaw`SELECT id FROM \`FundSource\` WHERE id = ${fundSourceId} FOR UPDATE`;
}

export async function createFundLedgerEntry(
  input: CreateFundLedgerEntryInput,
  client: LedgerClient = prisma
) {
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

/**
 * Posts a credit against a fund, refusing to overdraw it.
 *
 * The lock, the balance check, and the write all happen inside the caller's
 * transaction, so no other writer can slip between the check and the write.
 * Returns the shortfall instead of throwing when funds are short, leaving the
 * caller to turn that into a message.
 */
export async function spendFromFund(
  input: CreateFundLedgerEntryInput & { credit: number },
  client: Prisma.TransactionClient
): Promise<{ ok: true } | { ok: false; balance: number; required: number }> {
  await lockFundSource(input.fundSourceId, client);

  const balance = await getFundSourceBalance(input.fundSourceId, client);

  if (balance < input.credit) {
    return { ok: false, balance, required: input.credit };
  }

  await createFundLedgerEntry(input, client);

  return { ok: true };
}
