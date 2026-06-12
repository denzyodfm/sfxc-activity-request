import prisma from '@/lib/prisma';
import FundAvailabilityForm from '@/components/FundAvailabilityForm';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function FundAvailabilityPage() {
  const session = await getSession();
  
  if (!session || session.role !== 'FUND_OFFICER' && session.role !== 'ADMIN') {
    redirect('/login');
  }

  const [requests, fundSources] = await Promise.all([
    prisma.activityRequest.findMany({
      orderBy: { date: 'desc' },
      include: { department: true, requestedBy: true, fundSource: true, attachments: true }
    }),
    prisma.fundSource.findMany({ select: { id: true, name: true } })
  ]);

  return (
    <section className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Fund Availability</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Verify Funding and Assign a Source</h1>
        <p className="mt-3 max-w-2xl text-slate-600">Review activity requests from all departments and confirm if the school has enough funds to carry them out.</p>
      </div>

      <div className="grid gap-6">
        {requests.length === 0 ? (
          <div className="sfxc-card p-8 text-slate-600">No requests are available yet.</div>
        ) : (
          requests.map((request) => (
            <FundAvailabilityForm
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
              fundSourceId={request.fundSourceId}
              fundSources={fundSources}
            />
          ))
        )}
      </div>
    </section>
  );
}
