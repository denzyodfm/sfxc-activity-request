import prisma from '@/lib/prisma';
import ApprovalForm from '@/components/ApprovalForm';
import RequestQueueItem from '@/components/RequestQueueItem';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import VoucherPrint from '@/components/VoucherPrint';

interface ApprovalPageProps {
  searchParams: { approver?: string };
}

export default async function ApprovalPage({ searchParams }: ApprovalPageProps) {
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }

  if (session.role !== 'APPROVER_JMAPC' && session.role !== 'APPROVER_JCA' && session.role !== 'ADMIN') {
    return (
      <section className="space-y-6">
        <div className="sfxc-card p-8 text-center">
          <p className="text-slate-600">You do not have permission to access this page.</p>
        </div>
      </section>
    );
  }

  const filterByApprover = session.role === 'APPROVER_JMAPC' ? 'APPROVER_JMAPC' : session.role === 'APPROVER_JCA' ? 'APPROVER_JCA' : searchParams.approver;

  const [requests, signatories, jca, jmapc] = await Promise.all([
    prisma.activityRequest.findMany({
      where: {
        status: 'FOR_APPROVAL',
        ...(filterByApprover ? { finalApprover: filterByApprover } : {})
      },
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

  const approverLabels: Record<string, string> = {
    APPROVER_JMAPC: 'JMAPC',
    APPROVER_JCA: 'JCA'
  };

  return (
    <section className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Approval</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Final Approver Review</h1>
        <p className="mt-3 max-w-2xl text-slate-600">Review endorsed requests and complete the final approval decision.</p>
      </div>

      <div className="grid gap-6">
        {requests.length === 0 ? (
          <div className="sfxc-card p-8 text-slate-600">No requests are ready for final approval right now.</div>
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
              <RequestQueueItem key={request.id} request={requestDetails} actionLabel="Approve">
                <div className="space-y-2">
                  <VoucherPrint request={request} signatories={signatories} roleNames={{ jca: jca?.name, jmapc: jmapc?.name }} />
                  <ApprovalForm
                    requestId={request.id}
                    request={requestDetails}
                    finalApproverLabel={approverLabels[request.finalApprover ?? 'APPROVER_JMAPC'] ?? 'TBD'}
                  />
                </div>
              </RequestQueueItem>
            );
          })
        )}
      </div>
    </section>
  );
}

