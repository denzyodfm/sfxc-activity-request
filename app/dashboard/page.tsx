import prisma from '@/lib/prisma';
import RequestCard from '@/components/RequestCard';
import DashboardRequestBrowser from '@/components/DashboardRequestBrowser';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

/**
 * How many requests the browsable list holds. The status tiles stay accurate
 * beyond this because they are counted in the database, not from this array.
 */
const DASHBOARD_PAGE_SIZE = 200;

export default async function DashboardPage() {
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }

  let whereClause: any = {};
  
  // Requestor can only see their own department's requests
  if (session.role === 'REQUESTOR') {
    if (session.departmentId) {
      whereClause = { departmentId: session.departmentId };
    } else {
      whereClause = { requestedById: session.id };
    }
  }

  // The tiles need a count per status across everything the user may see, but
  // the list itself only ever renders a page of rows. Counting with groupBy
  // keeps the tiles exact without loading the whole table — this query used to
  // pull every request with four relations joined on every dashboard view.
  const [statusGroups, requests] = await Promise.all([
    prisma.activityRequest.groupBy({
      by: ['status'],
      where: whereClause,
      _count: { _all: true }
    }),
    prisma.activityRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: { department: true, requestedBy: true, fundSource: true, attachments: true },
      where: whereClause,
      take: DASHBOARD_PAGE_SIZE
    })
  ]);

  const statusCounts: Record<string, number> = {};
  let totalRequests = 0;

  for (const group of statusGroups) {
    statusCounts[group.status] = group._count._all;
    totalRequests += group._count._all;
  }

  const dashboardRequests = requests.map((request) => ({
    id: request.id,
    createdAt: request.createdAt.toISOString(),
    controlNumber: request.controlNumber,
    date: request.date.toISOString(),
    departmentName: request.department.name,
    requestedByName: request.requestedBy.name,
    particulars: request.particulars,
    amount: Number(request.amount),
    status: request.status,
    fundSourceName: request.fundSource?.name,
    attachments: request.attachments.map((attachment) => ({
      id: attachment.id,
      fileName: attachment.fileName,
      fileUrl: attachment.fileUrl
    }))
  }));
  const recent = requests.slice(0, 5);

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Dashboard</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Activity Request Control</h1>
          <p className="mt-2 max-w-2xl text-slate-600">Track request progress through fund availability, review, endorsement, and final approval for SFXC.</p>
        </div>
        {session.role === 'REQUESTOR' || session.role === 'ADMIN' ? (
          <Link href="/requests/new" className="sfxc-button">
            New Activity Request
          </Link>
        ) : null}
      </div>

      <DashboardRequestBrowser
        requests={dashboardRequests}
        statusCounts={statusCounts}
        totalRequests={totalRequests}
      />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="sfxc-card p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Recent Activity Requests</h2>
              <p className="text-sm text-slate-500">
                {session.role === 'REQUESTOR' ? 'Your requests from your department.' : 'Latest requests from all departments.'}
              </p>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            {recent.length === 0 ? (
              <p className="text-sm text-slate-500">No requests available yet.</p>
            ) : (
              recent.map((request) => <RequestCard key={request.id} request={request} />)
            )}
          </div>
        </div>

        <div className="sfxc-card p-6">
          <h2 className="text-xl font-semibold text-slate-900">Your Role</h2>
          <p className="mt-2 text-sm text-slate-500">Assigned permissions and workflow access.</p>
          <div className="mt-6 space-y-3">
            <div className="rounded-full bg-sfxc-green px-4 py-2 text-sm font-semibold text-white inline-block">
              {session.role.replace(/_/g, ' ')}
            </div>
            <p className="text-xs text-slate-600 mt-4">You can view requests from:</p>
            <p className="text-sm font-semibold text-slate-900">
              {session.role === 'REQUESTOR' ? 'Your Department Only' : 'All Departments'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
