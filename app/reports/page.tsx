import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { formatMoney } from '@/lib/money';
import { buildRequestReportFilter, parseReportRange, canExportLedger } from '@/lib/reports';
import ReportFilters from '@/components/ReportFilters';

export const dynamic = 'force-dynamic';

/** Stages a request can sit in while it waits for somebody to act. */
const PENDING_STATUSES = ['FOR_FUND_AVAILABILITY', 'FOR_REVIEW', 'FOR_ENDORSEMENT', 'FOR_APPROVAL', 'APPROVED'];

const STAGE_LABELS: Record<string, string> = {
  FOR_FUND_AVAILABILITY: 'Fund Availability',
  FOR_REVIEW: 'Review',
  FOR_ENDORSEMENT: 'Endorsement',
  FOR_APPROVAL: 'Final Approval',
  APPROVED: 'Voucher Preparation'
};

interface ReportsPageProps {
  searchParams: Record<string, string | undefined>;
}

function daysSince(date: Date) {
  return Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const params = new URLSearchParams(
    Object.entries(searchParams).filter((entry): entry is [string, string] => Boolean(entry[1]))
  );

  const range = parseReportRange(params);
  const rangeError = 'error' in range ? range.error : null;
  const where = buildRequestReportFilter(session, params, rangeError ? {} : (range as { from?: Date; to?: Date }));

  const [departments, fundSources, statusGroups, departmentGroups, pending, totals] = await Promise.all([
    prisma.department.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.fundSource.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.activityRequest.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
      _sum: { amount: true }
    }),
    prisma.activityRequest.groupBy({
      by: ['departmentId'],
      where,
      _count: { _all: true },
      _sum: { amount: true }
    }),
    prisma.activityRequest.findMany({
      where: { ...where, status: { in: PENDING_STATUSES } },
      orderBy: { updatedAt: 'asc' },
      take: 50,
      select: {
        id: true,
        controlNumber: true,
        status: true,
        amount: true,
        updatedAt: true,
        department: { select: { name: true } }
      }
    }),
    prisma.activityRequest.aggregate({ where, _count: { _all: true }, _sum: { amount: true } })
  ]);

  const departmentNames = new Map(departments.map((department) => [department.id, department.name]));

  const departmentRows = departmentGroups
    .map((group) => ({
      name: departmentNames.get(group.departmentId) ?? 'Unknown',
      count: group._count._all,
      amount: Number(group._sum.amount ?? 0)
    }))
    .sort((a, b) => b.amount - a.amount);

  const statusRows = statusGroups
    .map((group) => ({
      status: group.status,
      count: group._count._all,
      amount: Number(group._sum.amount ?? 0)
    }))
    .sort((a, b) => b.count - a.count);

  // Anything untouched for more than a week is worth chasing.
  const aging = pending.map((item) => ({ ...item, age: daysSince(item.updatedAt) })).filter((item) => item.age >= 7);

  const exportQuery = params.toString();

  return (
    <section className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Reports</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Spending and Workflow Reports</h1>
        <p className="mt-3 max-w-3xl text-slate-600">
          {session.role === 'REQUESTOR'
            ? 'Summaries for your department, with CSV export.'
            : 'Summaries across all departments, with CSV export for requests and the fund ledger.'}
        </p>
      </div>

      <ReportFilters
        departments={departments}
        fundSources={fundSources}
        canExportLedger={canExportLedger(session.role)}
        exportQuery={exportQuery}
        initial={{
          from: searchParams.from ?? '',
          to: searchParams.to ?? '',
          status: searchParams.status ?? 'ALL',
          departmentId: searchParams.departmentId ?? 'ALL',
          fundSourceId: searchParams.fundSourceId ?? 'ALL'
        }}
        lockDepartment={session.role === 'REQUESTOR'}
      />

      {rangeError ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {rangeError} Showing unfiltered results.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="sfxc-card p-6">
          <p className="text-sm text-slate-500">Requests in range</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{totals._count._all}</p>
        </div>
        <div className="sfxc-card p-6">
          <p className="text-sm text-slate-500">Total value</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{formatMoney(Number(totals._sum.amount ?? 0))}</p>
        </div>
        <div className="sfxc-card p-6">
          <p className="text-sm text-slate-500">Waiting 7+ days</p>
          <p className={`mt-2 text-3xl font-semibold ${aging.length > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
            {aging.length}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="sfxc-card p-6">
          <h2 className="text-xl font-semibold text-slate-900">By Status</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.16em] text-slate-400">
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Count</th>
                  <th className="pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {statusRows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-4 text-slate-500">
                      No requests in this range.
                    </td>
                  </tr>
                ) : (
                  statusRows.map((row) => (
                    <tr key={row.status} className="border-t border-slate-100">
                      <td className="py-2 font-medium text-slate-900">{row.status.replace(/_/g, ' ')}</td>
                      <td className="py-2 text-right text-slate-700">{row.count}</td>
                      <td className="py-2 text-right text-slate-700">{formatMoney(row.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="sfxc-card p-6">
          <h2 className="text-xl font-semibold text-slate-900">By Department</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.16em] text-slate-400">
                  <th className="pb-2">Department</th>
                  <th className="pb-2 text-right">Count</th>
                  <th className="pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {departmentRows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-4 text-slate-500">
                      No requests in this range.
                    </td>
                  </tr>
                ) : (
                  departmentRows.map((row) => (
                    <tr key={row.name} className="border-t border-slate-100">
                      <td className="py-2 font-medium text-slate-900">{row.name}</td>
                      <td className="py-2 text-right text-slate-700">{row.count}</td>
                      <td className="py-2 text-right text-slate-700">{formatMoney(row.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="sfxc-card p-6">
        <h2 className="text-xl font-semibold text-slate-900">Stuck Requests</h2>
        <p className="mt-1 text-sm text-slate-500">
          Pending requests with no activity for a week or more, oldest first.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.16em] text-slate-400">
                <th className="pb-2">Control No.</th>
                <th className="pb-2">Department</th>
                <th className="pb-2">Waiting At</th>
                <th className="pb-2 text-right">Amount</th>
                <th className="pb-2 text-right">Days</th>
              </tr>
            </thead>
            <tbody>
              {aging.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-slate-500">
                    Nothing has been waiting a week or more.
                  </td>
                </tr>
              ) : (
                aging.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="py-2 font-medium text-slate-900">{item.controlNumber}</td>
                    <td className="py-2 text-slate-700">{item.department.name}</td>
                    <td className="py-2 text-slate-700">{STAGE_LABELS[item.status] ?? item.status}</td>
                    <td className="py-2 text-right text-slate-700">{formatMoney(Number(item.amount))}</td>
                    <td
                      className={`py-2 text-right font-semibold ${item.age >= 30 ? 'text-rose-600' : 'text-amber-600'}`}
                    >
                      {item.age}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
