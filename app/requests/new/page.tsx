import prisma from '@/lib/prisma';
import RequestFormClient from '@/components/RequestFormClient';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function NewRequestPage() {
  const session = await getSession();
  
  if (!session || session.role !== 'REQUESTOR' && session.role !== 'ADMIN') {
    redirect('/login');
  }

  const assignedDepartment = session.departmentId
    ? await prisma.department.findUnique({
        where: { id: session.departmentId },
        select: { id: true, name: true }
      })
    : null;
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const countToday = await prisma.activityRequest.count({
    where: { date: { gte: start, lte: end } }
  });
  const nextControlNumber = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-SFXC-${String(countToday + 1).padStart(5, '0')}`;

  return (
    <section className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Make Request</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">New Activity Request</h1>
        <p className="mt-3 max-w-2xl text-slate-600">Complete the form to create an activity request and send it through the SFXC approval workflow.</p>
      </div>
      <RequestFormClient
        assignedDepartment={assignedDepartment}
        requester={{ id: session.id, name: session.name }}
        requestDate={now.toISOString()}
        nextControlNumber={nextControlNumber}
      />
    </section>
  );
}
