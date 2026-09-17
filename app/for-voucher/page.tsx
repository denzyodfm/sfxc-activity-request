import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import MarkVoucherDoneButton from '@/components/MarkVoucherDoneButton';
import RequestQueueItem from '@/components/RequestQueueItem';
import VoucherPrint from '@/components/VoucherPrint';
import WorkflowAttachments from '@/components/WorkflowAttachments';
import ScheduledReleaseDate from '@/components/ScheduledReleaseDate';
import WorkflowHistory from '@/components/WorkflowHistory';
import { PanelFooter, PanelHeader, panelClass } from '@/components/WorkflowPanel';

export default async function ForVoucherPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (!['ADMIN', 'REVIEWER', 'FUND_OFFICER'].includes(session.role)) {
    return (
      <section className="space-y-6">
        <div className="sfxc-card p-8 text-center">
          <p className="text-slate-600">You do not have permission to access this page.</p>
        </div>
      </section>
    );
  }

  const [requests, signatories, jca, jmapc] = await Promise.all([
    prisma.activityRequest.findMany({
      where: { status: 'APPROVED' },
      orderBy: { date: 'desc' },
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
          requests.map((request) => {
            const requestDetails = {
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
            };

            return (
              <RequestQueueItem key={request.id} request={requestDetails} actionLabel="Open Voucher" defaultTab={3} tabs={[
                { label: 'Voucher', content: <VoucherPrint request={request} signatories={signatories} roleNames={{ jca: jca?.name, jmapc: jmapc?.name }} showHistory={false} /> },
                { label: 'History', content: <WorkflowHistory request={request} /> },
                { label: 'Release & Complete', content: <section className={panelClass}>
                    <PanelHeader eyebrow="Next Step" title="Release Voucher" description={request.particulars} />
                    <div className="p-5">
                      <ScheduledReleaseDate requestId={request.id} initialDate={request.scheduledReleaseDate} />
                      <div className="mt-5">
                      <WorkflowAttachments attachments={requestDetails.attachments} />
                      </div>
                    </div>
                    <PanelFooter hint="Close the voucher once it has been printed and released.">
                      <MarkVoucherDoneButton requestId={request.id} />
                    </PanelFooter>
                  </section> }
              ]} />
            );
          })
        )}
      </div>
    </section>
  );
}
