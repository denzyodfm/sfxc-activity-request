import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ManualPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Help</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">User Manual</h1>
          <p className="mt-3 max-w-2xl text-slate-600">
            How a request travels from the department that needs the money to a completed voucher, and what each role
            does when it reaches them. Part IV covers the administrator settings.
          </p>
        </div>
        <a href="/api/manual" target="_blank" rel="noreferrer" className="sfxc-button whitespace-nowrap">
          Open in a New Tab
        </a>
      </div>

      {/* The handbook is a self-contained document with its own typography, so
          it is framed rather than inlined — that keeps its styles from mixing
          with the app's. It scrolls inside the frame. */}
      <div className="sfxc-card overflow-hidden p-0">
        <iframe
          src="/api/manual"
          title="SFXC Activity Request user manual"
          className="h-[calc(100vh-19rem)] min-h-[32rem] w-full border-0"
        />
      </div>
    </section>
  );
}
