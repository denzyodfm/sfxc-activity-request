import prisma from '@/lib/prisma';
import ApprovalForm from '@/components/ApprovalForm';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

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

  const requests = await prisma.activityRequest.findMany({
    where: {
      status: 'FOR_APPROVAL',
      ...(filterByApprover ? { finalApprover: filterByApprover } : {})
    },
    orderBy: { date: 'desc' },
    include: { department: true, requestedBy: true, fundSource: true, attachments: true }
  });

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
          requests.map((request) => (
            <ApprovalForm
              key={request.id}
              requestId={request.id}
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
              finalApproverLabel={approverLabels[request.finalApprover ?? 'APPROVER_JMAPC'] ?? 'TBD'}
            />
          ))
        )}
      </div>
    </section>
  );
}

