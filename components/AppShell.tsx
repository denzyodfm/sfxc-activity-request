'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import AccountPanel from '@/components/AccountPanel';
import { useSession } from '@/lib/session-context';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[1600px] overflow-hidden">
      {isSidebarOpen ? <Sidebar /> : null}
      <main className="flex-1 p-6 print:p-0 lg:px-10 lg:py-8">
        <div className="mb-8 flex items-start justify-between gap-4 print:hidden">
          <button
            type="button"
            onClick={() => setIsSidebarOpen((current) => !current)}
            className="hidden rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sfxc-green hover:text-sfxc-green lg:inline-flex"
            aria-pressed={!isSidebarOpen}
          >
            {isSidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
          </button>
          <AccountPanel />
        </div>
        {children}
      </main>
    </div>
  );
}
