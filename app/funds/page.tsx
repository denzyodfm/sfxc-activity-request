import { redirect } from 'next/navigation';
import FundSourceManager from '@/components/FundSourceManager';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function canManageFunds(role: string) {
  return ['ADMIN', 'FUND_OFFICER'].includes(role);
}

export default async function FundsPage() {
  const session = await getSession();

  if (!session || !canManageFunds(session.role)) {
    redirect('/login');
  }

  const fundSources = await prisma.fundSource.findMany({
    orderBy: { name: 'asc' },
    include: {
      ledgerEntries: {
        orderBy: { createdAt: 'desc' },
        take: 25,
        include: {
          actor: { select: { name: true } },
          request: { select: { controlNumber: true } }
        }
      }
    }
  });

  const summaries = await Promise.all(
    fundSources.map(async (source) => {
      const [latestEntry, totals] = await Promise.all([
        prisma.fundLedgerEntry.findFirst({
          where: { fundSourceId: source.id },
          orderBy: { createdAt: 'desc' },
          select: { balanceAfter: true }
        }),
        prisma.fundLedgerEntry.aggregate({
          where: { fundSourceId: source.id },
          _sum: { debit: true, credit: true }
        })
      ]);

      return {
        id: source.id,
        name: source.name,
        description: source.description,
        balance: Number(latestEntry?.balanceAfter ?? 0),
        totalDebit: Number(totals._sum.debit ?? 0),
        totalCredit: Number(totals._sum.credit ?? 0),
        ledgerEntries: source.ledgerEntries.map((entry) => ({
          id: entry.id,
          type: entry.type,
          description: entry.description,
          debit: Number(entry.debit),
          credit: Number(entry.credit),
          balanceAfter: Number(entry.balanceAfter),
          createdAt: entry.createdAt.toISOString(),
          transactionDate: entry.transactionDate.toISOString(),
          reference: entry.reference,
          actorName: entry.actor?.name,
          controlNumber: entry.request?.controlNumber
        }))
      };
    })
  );

  return (
    <section className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Source of Funds</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Manage Source of Funds and Ledger</h1>
        <p className="mt-3 max-w-3xl text-slate-600">
          Add fund accounts, post deposits, and review debit and credit movement for completed activity requests.
        </p>
      </div>

      <FundSourceManager fundSources={summaries} />
    </section>
  );
}
