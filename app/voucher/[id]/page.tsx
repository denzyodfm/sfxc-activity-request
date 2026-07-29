import prisma from '@/lib/prisma';
import VoucherPrint from '@/components/VoucherPrint';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

interface VoucherPageProps {
  params: { id: string };
}

export default async function VoucherPage({ params }: VoucherPageProps) {
  const session = await getSession();
  if (!session) redirect('/login');

  const request = await prisma.activityRequest.findUnique({
    where: { id: params.id },
    include: {
      department: true,
      requestedBy: true,
      approvedBy: true,
      fundSource: { include: { parent: true } },
      attachments: true,
      approvals: {
        include: { actor: true },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  const [signatories, jca, jmapc] = await Promise.all([
    prisma.voucherSignatory.findMany(),
    prisma.user.findFirst({ where: { role: 'APPROVER_JCA' }, select: { name: true } }),
    prisma.user.findFirst({ where: { role: 'APPROVER_JMAPC' }, select: { name: true } })
  ]);

  if (!request) {
    return (
      <section className="space-y-6">
        <div className="sfxc-card p-8 text-slate-600">Request not found.</div>
      </section>
    );
  }

  return (
    <section className="space-y-8 print:space-y-0">
      <VoucherPrint
        request={request}
        signatories={signatories}
        roleNames={{ jca: jca?.name, jmapc: jmapc?.name }}
        canEdit={['ADMIN', 'FUND_OFFICER'].includes(session.role) && request.status === 'APPROVED'}
      />
    </section>
  );
}
