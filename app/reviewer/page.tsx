import prisma from '@/lib/prisma';
import ReviewForm from '@/components/ReviewForm';
import RequestQueueItem from '@/components/RequestQueueItem';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import VoucherPrint from '@/components/VoucherPrint';

export default async function ReviewerPage() {
  const session = await getSession();
  
  if (!session || session.role !== 'REVIEWER' && session.role !== 'ADMIN') {
    redirect('/login');
  }

  const [requests, signatories, jca, jmapc] = await Promise.all([
    prisma.activityRequest.findMany({
      where: { status: 'FOR_REVIEW' },
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
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Reviewer</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Assess and Forward Requests</h1>
        <p className="mt-3 max-w-2xl text-slate-600">Review each request carefully and determine whether it should proceed to endorsement.</p>
      </div>

      <div className="grid gap-6">
        {requests.length === 0 ? (
          <div className="sfxc-card p-8 text-slate-600">No requests currently need review.</div>
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
              <RequestQueueItem key={request.id} request={requestDetails} actionLabel="Review">
                <div className="space-y-2">
                  <VoucherPrint request={request} signatories={signatories} roleNames={{ jca: jca?.name, jmapc: jmapc?.name }} />
                  <ReviewForm requestId={request.id} request={requestDetails} />
                </div>
              </RequestQueueItem>
            );
          })
        )}
      </div>
    </section>
  );
}
