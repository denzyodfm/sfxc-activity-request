import prisma from '@/lib/prisma';
import AttachmentManager from '@/components/AttachmentManager';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AttachmentsPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  let requestWhere = {};

  if (session.role === 'REQUESTOR') {
    requestWhere = session.departmentId ? { departmentId: session.departmentId } : { requestedById: session.id };
  }

  const [requests, attachments] = await Promise.all([
    prisma.activityRequest.findMany({ where: requestWhere, select: { id: true, controlNumber: true }, orderBy: { createdAt: 'desc' } }),
    prisma.requestAttachment.findMany({
      where: { request: requestWhere },
      select: { id: true, fileName: true, fileUrl: true, requestId: true },
      orderBy: { createdAt: 'desc' }
    })
  ]);

  return (
    <section className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Attachments</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Supporting Documents</h1>
        <p className="mt-3 max-w-2xl text-slate-600">Upload proof of quotation, invoices, or other materials for your request.</p>
      </div>
      <AttachmentManager requests={requests} attachments={attachments} />
    </section>
  );
}
