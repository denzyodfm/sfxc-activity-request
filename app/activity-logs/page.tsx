import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

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

      <div className="sfxc-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-5 py-4 font-semibold">Timestamp</th>
                <th className="px-5 py-4 font-semibold">User</th>
                <th className="px-5 py-4 font-semibold">Process</th>
                <th className="px-5 py-4 font-semibold">Request</th>
                <th className="px-5 py-4 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {logs.map((log) => (
                <tr key={log.id} className="align-top hover:bg-slate-50">
                  <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                    {log.createdAt.toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-900">{log.user?.name ?? 'System'}</p>
                    <p className="text-xs text-slate-500">{log.user?.role.replace(/_/g, ' ') ?? 'SYSTEM'}</p>
                    {log.user?.email ? <p className="text-xs text-slate-400">{log.user.email}</p> : null}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 font-semibold text-sfxc-green">
                    {formatAction(log.action)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                    {log.request?.controlNumber ?? '—'}
                  </td>
                  <td className="min-w-72 px-5 py-4 text-slate-600">{log.details ?? '—'}</td>
                </tr>
              ))}
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-500">No activities recorded yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
