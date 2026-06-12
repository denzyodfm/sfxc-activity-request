import prisma from '@/lib/prisma';
import VoucherPrint from '@/components/VoucherPrint';

interface VoucherPageProps {
  params: { id: string };
}

export default async function VoucherPage({ params }: VoucherPageProps) {
  const request = await prisma.activityRequest.findUnique({
    where: { id: params.id },
    include: {
      department: true,
      requestedBy: true,
      approvedBy: true,
      fundSource: true,
      attachments: true,
      approvals: {
        include: { actor: true },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  const [fallbackReviewer, fallbackEndorser] = await Promise.all([
    prisma.user.findFirst({ where: { role: 'REVIEWER' }, select: { name: true } }),
    prisma.user.findFirst({ where: { role: 'ENDORSER' }, select: { name: true } })
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
        fallbackReviewerName={fallbackReviewer?.name}
        fallbackEndorserName={fallbackEndorser?.name}
      />
    </section>
  );
}
