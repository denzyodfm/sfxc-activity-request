import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import RequestQueueItem from '@/components/RequestQueueItem';
import VoucherPrint from '@/components/VoucherPrint';
import WorkflowAttachments from '@/components/WorkflowAttachments';

export default async function DonePage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  let whereClause: any = { status: 'COMPLETED' };

  if (session.role === 'REQUESTOR') {
    whereClause = session.departmentId
      ? { ...whereClause, departmentId: session.departmentId }
      : { ...whereClause, requestedById: session.id };
  }

  const [requests, signatories, jca, jmapc] = await Promise.all([
    prisma.activityRequest.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' },
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
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Completed</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Completed Voucher Requests</h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          {session.role === 'REQUESTOR'
            ? 'Completed requests from your assigned department.'
            : 'Completed requests from all departments.'}
        </p>
      </div>

      <div className="grid gap-6">
        {requests.length === 0 ? (
          <div className="sfxc-card p-8 text-slate-600">No completed requests yet.</div>
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
              <RequestQueueItem key={request.id} request={requestDetails} actionLabel="View">
                <div className="space-y-2">
                  <VoucherPrint request={request} signatories={signatories} roleNames={{ jca: jca?.name, jmapc: jmapc?.name }} />
                  <div className="sfxc-card p-4">
                    <WorkflowAttachments attachments={requestDetails.attachments} />
                  </div>
                </div>
              </RequestQueueItem>
            );
          })
        )}
      </div>
    </section>
  );
}
