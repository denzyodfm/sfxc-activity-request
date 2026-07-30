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
    <div className="mx-auto flex min-h-screen max-w-[1600px] overflow-x-hidden">
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
      <main className="min-w-0 flex-1 px-3 py-4 print:p-0 sm:p-6 lg:px-10 lg:py-8">
        <div className="mb-6 flex flex-col items-start gap-3 print:hidden sm:mb-8 sm:flex-row sm:justify-between sm:gap-4">
          <button
            type="button"
            onClick={() => setIsSidebarOpen((current) => !current)}
            className={`inline-flex items-center justify-center bg-white text-slate-700 transition hover:text-sfxc-green ${
              isSidebarOpen
                ? 'h-11 w-11 rounded-full border border-slate-200 shadow-sm hover:border-sfxc-green'
                : 'h-16 w-16 rounded-2xl border border-slate-200 shadow-sm hover:border-sfxc-green'
            }`}
            aria-pressed={!isSidebarOpen}
            aria-label={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          >
            {isSidebarOpen ? (
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <circle cx="5" cy="12" r="1.8" />
                <circle cx="12" cy="12" r="1.8" />
                <circle cx="19" cy="12" r="1.8" />
              </svg>
            ) : (
              <img src="/sfxc_icon.png" alt="" className="h-12 w-12 object-contain" aria-hidden="true" />
            )}
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
