import prisma from '@/lib/prisma';
import AdminFormClient from '@/components/AdminFormClient';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AdminPage() {
  const session = await getSession();
  
  if (!session || session.role !== 'ADMIN') {
    redirect('/login');
  }

  const [users, departments, fundSources, voucherSignatories] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isDepartmentHead: true,
        department: { select: { id: true, name: true } },
        headedDepartment: { select: { id: true, name: true } }
      }
    }),
    prisma.department.findMany({ select: { id: true, name: true, headId: true } }),
    prisma.fundSource.findMany({
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
    }),
    prisma.voucherSignatory.findMany({ orderBy: { slot: 'asc' } })
  ]);

  const fundSummaries = await Promise.all(
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
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Admin Settings</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Manage Users, Departments, and Funds</h1>
        <p className="mt-3 max-w-2xl text-slate-600">Create users, assign roles, manage departments, and maintain source of fund accounts.</p>
      </div>
      <AdminFormClient
        users={users}
        departments={departments}
        fundSources={fundSummaries}
        voucherSignatories={voucherSignatories.map((item) => ({
          slot: item.slot,
          name: item.name,
          title: item.title ?? ''
        }))}
      />
    </section>
  );
}
