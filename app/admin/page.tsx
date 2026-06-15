import prisma from '@/lib/prisma';
import AdminFormClient from '@/components/AdminFormClient';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AdminPage() {
  const session = await getSession();
  
  if (!session || session.role !== 'ADMIN') {
    redirect('/login');
  }

  const [users, departments] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isDepartmentHead: true,
        department: { select: { id: true, name: true } },
        headedDepartment: { select: { id: true, name: true } }
      }
    }),
    prisma.department.findMany({ select: { id: true, name: true, headId: true } })
  ]);

  return (
    <section className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Admin Settings</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Manage Users and Departments</h1>
        <p className="mt-3 max-w-2xl text-slate-600">Create users, assign roles, and manage departments for the activity request system.</p>
      </div>
      <AdminFormClient users={users} departments={departments} />
    </section>
  );
}
