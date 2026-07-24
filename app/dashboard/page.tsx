import prisma from '@/lib/prisma';
import RequestCard from '@/components/RequestCard';
import DashboardRequestBrowser from '@/components/DashboardRequestBrowser';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

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

  const requests = await prisma.activityRequest.findMany({
    orderBy: { createdAt: 'desc' },
    include: { department: true, requestedBy: true, fundSource: true, attachments: true },
    where: whereClause
  });

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

      <DashboardRequestBrowser requests={dashboardRequests} />

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
