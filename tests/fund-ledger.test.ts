import { beforeEach, describe, expect, it, vi } from 'vitest';

// lib/fund-ledger.ts imports the shared Prisma client for its default argument.
// Instantiating a real one here would try to load the generated engine and read
// DATABASE_URL, so it is stubbed. Every function under test takes an explicit
// client, and the tests always pass one.
vi.mock('@/lib/prisma', () => ({ default: {} }));

const { createFundLedgerEntry, getFundSourceBalance, spendFromFund } = await import(
  '@/lib/fund-ledger'
);

/**
 * A stand-in for a Prisma transaction client, holding ledger rows in memory.
 *
 * Only the three operations fund-ledger.ts uses are implemented: the aggregate
 * that sums debits and credits, the create that appends a row, and the raw
 * SELECT ... FOR UPDATE that takes the row lock.
 */
function fakeClient(rows: Array<{ fundSourceId: string; debit: number; credit: number }> = []) {
  const locks: string[] = [];
  const created: Array<Record<string, unknown>> = [];

  const client = {
    rows,
    locks,
    created,
    fundLedgerEntry: {
      aggregate: vi.fn(async ({ where }: { where: { fundSourceId: string } }) => {
        const matching = rows.filter((row) => row.fundSourceId === where.fundSourceId);
        return {
          _sum: {
            debit: matching.reduce((total, row) => total + row.debit, 0),
            credit: matching.reduce((total, row) => total + row.credit, 0)
          }
        };
      }),
      create: vi.fn(async ({ data }: { data: any }) => {
        rows.push({ fundSourceId: data.fundSourceId, debit: data.debit, credit: data.credit });
        created.push(data);
        return { id: `entry-${created.length}`, ...data };
      })
    },
    $queryRaw: vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
      locks.push(String(values[0]));
      return [];
    })
  };

  return client as typeof client & any;
}

const FUND = 'fund-1';

describe('getFundSourceBalance', () => {
  it('is zero for a fund with no entries', async () => {
    expect(await getFundSourceBalance(FUND, fakeClient())).toBe(0);
  });

  it('is debits minus credits', async () => {
    const client = fakeClient([
      { fundSourceId: FUND, debit: 500000, credit: 0 },
      { fundSourceId: FUND, debit: 0, credit: 12500 },
      { fundSourceId: FUND, debit: 0, credit: 8450 }
    ]);

    expect(await getFundSourceBalance(FUND, client)).toBe(479050);
  });

  it('ignores entries belonging to other funds', async () => {
    const client = fakeClient([
      { fundSourceId: FUND, debit: 100, credit: 0 },
      { fundSourceId: 'fund-2', debit: 999999, credit: 0 }
    ]);

    expect(await getFundSourceBalance(FUND, client)).toBe(100);
  });

  // The balance is summed rather than read off the newest row's balanceAfter,
  // because two rows written in the same millisecond have no reliable order.
  it('does not depend on any stored balanceAfter', async () => {
    const client = fakeClient([{ fundSourceId: FUND, debit: 100, credit: 0 }]);
    client.rows[0] = { ...client.rows[0], balanceAfter: -999 } as any;

    expect(await getFundSourceBalance(FUND, client)).toBe(100);
  });

  it('treats a null sum from an empty aggregate as zero', async () => {
    const client = fakeClient();
    client.fundLedgerEntry.aggregate = vi.fn(async () => ({
      _sum: { debit: null, credit: null }
    })) as any;

    expect(await getFundSourceBalance(FUND, client)).toBe(0);
  });
});

describe('createFundLedgerEntry', () => {
  it('records balanceAfter as the balance the entry produces', async () => {
    const client = fakeClient([{ fundSourceId: FUND, debit: 500000, credit: 0 }]);

    await createFundLedgerEntry(
      { fundSourceId: FUND, type: 'VOUCHER', description: 'Field trip', credit: 12500 },
      client
    );

    expect(client.created[0]).toMatchObject({
      fundSourceId: FUND,
      debit: 0,
      credit: 12500,
      balanceAfter: 487500
    });
  });

  it('defaults the unspecified side of the entry to zero', async () => {
    const client = fakeClient();

    await createFundLedgerEntry(
      { fundSourceId: FUND, type: 'DEPOSIT', description: 'Opening balance', debit: 250000 },
      client
    );

    expect(client.created[0]).toMatchObject({ debit: 250000, credit: 0, balanceAfter: 250000 });
  });

  it('records a deposit as an increase', async () => {
    const client = fakeClient([{ fundSourceId: FUND, debit: 100, credit: 0 }]);

    await createFundLedgerEntry(
      { fundSourceId: FUND, type: 'DEPOSIT', description: 'Top up', debit: 50 },
      client
    );

    expect(await getFundSourceBalance(FUND, client)).toBe(150);
  });

  it('carries the request, actor and reference through to the row', async () => {
    const client = fakeClient();
    const transactionDate = new Date('2026-06-11T08:30:00Z');

    await createFundLedgerEntry(
      {
        fundSourceId: FUND,
        requestId: 'request-1',
        actorId: 'user-1',
        type: 'VOUCHER',
        description: 'Field trip',
        reference: 'V-0001',
        transactionDate,
        credit: 100
      },
      client
    );

    expect(client.created[0]).toMatchObject({
      requestId: 'request-1',
      actorId: 'user-1',
      reference: 'V-0001',
      transactionDate
    });
  });

  it('does not lock on its own — that is the caller\'s job', async () => {
    const client = fakeClient();
    await createFundLedgerEntry(
      { fundSourceId: FUND, type: 'DEPOSIT', description: 'x', debit: 1 },
      client
    );

    expect(client.locks).toEqual([]);
  });
});

describe('spendFromFund', () => {
  let client: ReturnType<typeof fakeClient>;

  beforeEach(() => {
    client = fakeClient([{ fundSourceId: FUND, debit: 500000, credit: 0 }]);
  });

  it('posts the credit when the fund covers it', async () => {
    const result = await spendFromFund(
      { fundSourceId: FUND, type: 'VOUCHER', description: 'Field trip', credit: 12500 },
      client
    );

    expect(result).toEqual({ ok: true });
    expect(await getFundSourceBalance(FUND, client)).toBe(487500);
  });

  it('allows a spend that empties the fund exactly', async () => {
    const result = await spendFromFund(
      { fundSourceId: FUND, type: 'VOUCHER', description: 'Everything', credit: 500000 },
      client
    );

    expect(result).toEqual({ ok: true });
    expect(await getFundSourceBalance(FUND, client)).toBe(0);
  });

  // Returning the shortfall rather than throwing is what lets the route turn it
  // into a message for the fund officer.
  it('refuses to overdraw and reports the balance and the requirement', async () => {
    const result = await spendFromFund(
      { fundSourceId: FUND, type: 'VOUCHER', description: 'Too much', credit: 500001 },
      client
    );

    expect(result).toEqual({ ok: false, balance: 500000, required: 500001 });
  });

  it('writes nothing at all when it refuses', async () => {
    await spendFromFund(
      { fundSourceId: FUND, type: 'VOUCHER', description: 'Too much', credit: 999999 },
      client
    );

    expect(client.created).toEqual([]);
    expect(await getFundSourceBalance(FUND, client)).toBe(500000);
  });

  it('refuses any spend against an empty fund', async () => {
    const empty = fakeClient();
    const result = await spendFromFund(
      { fundSourceId: FUND, type: 'VOUCHER', description: 'Nothing there', credit: 1 },
      empty
    );

    expect(result).toEqual({ ok: false, balance: 0, required: 1 });
  });

  // The lock is what stops two concurrent completions both reading the same
  // balance, both deciding there is enough, and both posting.
  it('takes the row lock on the fund before reading the balance', async () => {
    await spendFromFund(
      { fundSourceId: FUND, type: 'VOUCHER', description: 'Field trip', credit: 100 },
      client
    );

    expect(client.locks).toEqual([FUND]);
    expect(client.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      client.fundLedgerEntry.aggregate.mock.invocationCallOrder[0]
    );
  });

  it('takes the lock even when the spend is going to be refused', async () => {
    await spendFromFund(
      { fundSourceId: FUND, type: 'VOUCHER', description: 'Too much', credit: 999999 },
      client
    );

    expect(client.locks).toEqual([FUND]);
  });

  it('sequential spends draw the balance down and then refuse', async () => {
    const spend = (credit: number) =>
      spendFromFund({ fundSourceId: FUND, type: 'VOUCHER', description: 'x', credit }, client);

    expect(await spend(300000)).toEqual({ ok: true });
    expect(await spend(150000)).toEqual({ ok: true });
    expect(await getFundSourceBalance(FUND, client)).toBe(50000);
    expect(await spend(50001)).toEqual({ ok: false, balance: 50000, required: 50001 });
    expect(await spend(50000)).toEqual({ ok: true });
    expect(await getFundSourceBalance(FUND, client)).toBe(0);
  });
});
