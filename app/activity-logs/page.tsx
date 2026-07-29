import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ActivityLogsClient from '@/components/ActivityLogsClient';

function formatAction(action: string) {
  return action
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default async function ActivityLogsPage() {
  const session = await getSession();

  if (!session || session.role !== 'ADMIN') {
    redirect('/login');
  }

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 500,
    include: {
      user: {
        select: {
          name: true,
          email: true,
          role: true
        }
      },
      request: {
        select: {
          controlNumber: true
        }
      }
    }
  });

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">System Audit</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Activity Logs</h1>
        <p className="mt-2 text-slate-600">The 500 most recent user and workflow activities.</p>
      </div>

      <ActivityLogsClient
        logs={logs.map((log) => ({
          id: log.id,
          timestamp: log.createdAt.toISOString(),
          userName: log.user?.name ?? 'System',
          email: log.user?.email ?? '',
          role: log.user?.role ?? 'SYSTEM',
          process: formatAction(log.action),
          requestNumber: log.request?.controlNumber ?? '—',
          details: log.details ?? '—'
        }))}
      />
    </section>
  );
}
