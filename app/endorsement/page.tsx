import prisma from '@/lib/prisma';
import EndorsementForm from '@/components/EndorsementForm';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function EndorsementPage() {
  const session = await getSession();
  
  if (!session || session.role !== 'ENDORSER' && session.role !== 'ADMIN') {
    redirect('/login');
  }

  const requests = await prisma.activityRequest.findMany({
    where: { status: 'FOR_ENDORSEMENT' },
    orderBy: { date: 'desc' },
    include: { department: true, requestedBy: true, fundSource: true, attachments: true }
  });

  return (
    <section className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Endorsed By</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Choose Final Approver</h1>
        <p className="mt-3 max-w-2xl text-slate-600">Assign the request to either JMAPC or JCA and provide endorsement remarks.</p>
      </div>

      <div className="grid gap-6">
        {requests.length === 0 ? (
          <div className="sfxc-card p-8 text-slate-600">No requests need endorsement at this time.</div>
        ) : (
          requests.map((request) => (
            <EndorsementForm
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
            />
          ))
        )}
      </div>
    </section>
  );
}
