import Link from 'next/link';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import RequestDetails from '@/components/RequestDetails';

export default async function DonePage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  let whereClause: any = { status: 'DONE' };

  if (session.role === 'REQUESTOR') {
    const department = await prisma.department.findFirst({
      where: { headId: session.id },
      select: { id: true }
    });

    whereClause = department
      ? { ...whereClause, departmentId: department.id }
      : { ...whereClause, requestedById: session.id };
  }

  const requests = await prisma.activityRequest.findMany({
    where: whereClause,
    orderBy: { updatedAt: 'desc' },
    include: { department: true, requestedBy: true, fundSource: true, attachments: true }
  });

  return (
    <section className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Done</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Completed Voucher Requests</h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          {session.role === 'REQUESTOR'
            ? 'Completed requests from your assigned department.'
            : 'Completed requests from all departments.'}
        </p>
      </div>

      <div className="grid gap-6">
        {requests.length === 0 ? (
          <div className="sfxc-card p-8 text-slate-600">No done requests yet.</div>
        ) : (
          requests.map((request) => (
            <article key={request.id} className="sfxc-card p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm text-slate-500">Done Request</p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900">{request.particulars}</h2>
                </div>
                <Link href={`/voucher/${request.id}`} className="sfxc-button">
                  Print Again
                </Link>
              </div>
              <RequestDetails
                request={{
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
                }}
              />
            </article>
          ))
        )}
      </div>
    </section>
  );
}
