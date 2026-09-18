import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import RequestQueueItem from '@/components/RequestQueueItem';
import VoucherPrint from '@/components/VoucherPrint';
import WorkflowAttachments from '@/components/WorkflowAttachments';
import WorkflowHistory from '@/components/WorkflowHistory';
import ScheduledReleaseDate from '@/components/ScheduledReleaseDate';
import ActualReleaseDate from '@/components/ActualReleaseDate';
import { PanelHeader, panelClass } from '@/components/WorkflowPanel';

export default async function FundReleaseSchedulePage() {
  const session = await getSession();
  if (!session) redirect('/login');
  const isRequestor = session.role === 'REQUESTOR';
  if (!isRequestor && !['ADMIN', 'REVIEWER', 'FUND_OFFICER'].includes(session.role)) {
    return <section className="sfxc-card p-8 text-center text-slate-600">You do not have permission to access this page.</section>;
  }

  const [requests, signatories, jca, jmapc] = await Promise.all([
    prisma.activityRequest.findMany({
      where: {
        status: 'APPROVED',
        scheduledReleaseDate: { not: null },
        ...(isRequestor ? { requestedById: session.id } : {})
      },
      orderBy: [{ scheduledReleaseDate: 'asc' }, { date: 'desc' }],
      include: {
        department: true, requestedBy: true, attachments: true,
        fundSource: { include: { parent: true } },
        approvals: { include: { actor: true }, orderBy: { createdAt: 'desc' } }
      }
    }),
    prisma.voucherSignatory.findMany(),
    prisma.user.findFirst({ where: { role: 'APPROVER_JCA' }, select: { name: true } }),
    prisma.user.findFirst({ where: { role: 'APPROVER_JMAPC' }, select: { name: true } })
  ]);

  return <section className="space-y-8">
    <div>
      <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Fund Release Schedule</p>
      <h1 className="mt-2 text-3xl font-semibold text-slate-900">Scheduled Fund Releases</h1>
      <p className="mt-3 max-w-2xl text-slate-600">{isRequestor
        ? 'View the scheduled fund release for your requests. This information is read-only.'
        : 'Record the actual release date, then close the voucher. Completed vouchers move to Completed.'}</p>
    </div>
    <div className="grid gap-6">
      {requests.length === 0 ? <div className="sfxc-card p-8 text-slate-600">No vouchers are currently scheduled for fund release.</div> : requests.map((request) => {
        const requestDetails = {
          controlNumber: request.controlNumber,
          date: request.date.toISOString(),
          departmentName: request.department.name,
          requestedByName: request.requestedBy.name,
          particulars: request.particulars,
          amount: Number(request.amount),
          status: request.status,
          fundSourceName: request.fundSource?.name,
          attachments: request.attachments.map((attachment) => ({ id: attachment.id, fileName: attachment.fileName, fileUrl: attachment.fileUrl }))
        };
        return <RequestQueueItem key={request.id} request={requestDetails} actionLabel={isRequestor ? 'View Schedule' : 'Open Release'} defaultTab={3} dateLabel="Scheduled Release" dateValue={request.scheduledReleaseDate?.toLocaleDateString('en-PH', { timeZone: 'UTC' })} tabs={[
          { label: 'Voucher', content: <VoucherPrint request={request} signatories={signatories} roleNames={{ jca: jca?.name, jmapc: jmapc?.name }} showHistory={false} /> },
          { label: 'History', content: <WorkflowHistory request={request} /> },
          { label: 'Fund Release', content: <section className={panelClass}>
            <PanelHeader eyebrow="Scheduled Release" title={isRequestor ? 'Fund Release Schedule' : 'Release and Complete Voucher'} description={request.particulars} />
            <div className="space-y-5 p-5">
              {isRequestor ? <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div><dt className="font-medium text-slate-500">Scheduled fund release</dt><dd className="mt-1 font-semibold text-slate-900">{request.scheduledReleaseDate?.toLocaleDateString('en-PH', { timeZone: 'UTC' })}</dd></div>
                <div><dt className="font-medium text-slate-500">Actual fund release</dt><dd className="mt-1 font-semibold text-slate-900">{request.actualReleaseDate?.toLocaleDateString('en-PH', { timeZone: 'UTC' }) ?? 'Not yet released'}</dd></div>
              </dl> : <>
                <ScheduledReleaseDate requestId={request.id} initialDate={request.scheduledReleaseDate} />
                <ActualReleaseDate requestId={request.id} initialDate={request.actualReleaseDate} />
              </>}
              <WorkflowAttachments attachments={requestDetails.attachments} />
            </div>
          </section> }
        ]} />;
      })}
    </div>
  </section>;
}
