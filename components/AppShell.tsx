'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import AccountPanel from '@/components/AccountPanel';
import { useSession } from '@/lib/session-context';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const syncSidebar = () => setIsSidebarOpen(mediaQuery.matches);

    syncSidebar();
    mediaQuery.addEventListener('change', syncSidebar);
    return () => mediaQuery.removeEventListener('change', syncSidebar);
  }, []);

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[1600px] overflow-hidden">
      <div
        className={`fixed inset-0 z-30 bg-slate-950/40 transition-opacity lg:hidden ${
          isSidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setIsSidebarOpen(false)}
        aria-hidden="true"
      />
      <div
        className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 ease-out lg:static lg:z-auto lg:transform-none ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:hidden'
        }`}
      >
        <Sidebar onNavigate={() => setIsSidebarOpen(false)} />
      </div>
      <main className="flex-1 p-6 print:p-0 lg:px-10 lg:py-8">
        <div className="mb-8 flex items-start justify-between gap-4 print:hidden">
          <button
            type="button"
            onClick={() => setIsSidebarOpen((current) => !current)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-sfxc-green hover:text-sfxc-green"
            aria-pressed={!isSidebarOpen}
            aria-label={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          >
            <span className="relative block h-4 w-5" aria-hidden="true">
              <span
                className={`absolute left-0 h-0.5 w-5 rounded-full bg-current transition ${
                  isSidebarOpen ? 'top-1/2 -translate-y-1/2 rotate-45' : 'top-0'
                }`}
              />
              <span
                className={`absolute left-0 top-1/2 h-0.5 w-5 -translate-y-1/2 rounded-full bg-current transition ${
                  isSidebarOpen ? 'opacity-0' : 'opacity-100'
                }`}
              />
              <span
                className={`absolute left-0 h-0.5 w-5 rounded-full bg-current transition ${
                  isSidebarOpen ? 'top-1/2 -translate-y-1/2 -rotate-45' : 'bottom-0'
                }`}
              />
            </span>
          </button>
          <AccountPanel />
        </div>
        <div className="min-h-[calc(100vh-10rem)]">{children}</div>
        <footer className="mt-10 border-t border-slate-200/70 pt-6 text-center text-xs text-slate-500 print:hidden">
          &copy; {currentYear} St. Francis Xavier College. All rights reserved.
        </footer>
      </main>
    </div>
  );
}
