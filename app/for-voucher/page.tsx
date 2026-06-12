import Link from 'next/link';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import RequestDetails from '@/components/RequestDetails';
import MarkVoucherDoneButton from '@/components/MarkVoucherDoneButton';

export default async function ForVoucherPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (session.role !== 'ADMIN' && session.role !== 'REVIEWER') {
    return (
      <section className="space-y-6">
        <div className="sfxc-card p-8 text-center">
          <p className="text-slate-600">You do not have permission to access this page.</p>
        </div>
      </section>
    );
  }

  let whereClause: any = { status: 'APPROVED' };

  const requests = await prisma.activityRequest.findMany({
    where: whereClause,
    orderBy: { date: 'desc' },
    include: { department: true, requestedBy: true, fundSource: true, attachments: true }
  });

  return (
    <section className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">For Voucher</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Approved Requests for Voucher Printing</h1>
        <p className="mt-3 max-w-2xl text-slate-600">Only requests completed with final approval appear here.</p>
      </div>

      <div className="grid gap-6">
        {requests.length === 0 ? (
          <div className="sfxc-card p-8 text-slate-600">No requests are ready for voucher printing.</div>
        ) : (
          requests.map((request) => (
            <article key={request.id} className="sfxc-card p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm text-slate-500">Ready for Voucher</p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900">{request.particulars}</h2>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link href={`/voucher/${request.id}`} className="sfxc-button">
                    Print Voucher
                  </Link>
                  <MarkVoucherDoneButton requestId={request.id} />
                </div>
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
