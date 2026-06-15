'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/session-context';

export default function AccountPanel() {
  const { user, setUser } = useSession();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
  };

  return (
    <div className="ml-auto flex w-full max-w-4xl flex-wrap items-center justify-end gap-3 rounded-3xl bg-white px-4 py-3 text-sm text-slate-700 shadow-sm ring-1 ring-slate-200">
      <span className="text-xs text-slate-500">Logged in as:</span>
      <span className="font-semibold text-slate-900">{user.name}</span>
      <span className="text-xs text-slate-600">{user.email}</span>
      <span className="rounded-full bg-sfxc-green px-3 py-1 text-xs font-semibold text-white">
        {user.role.replace(/_/g, ' ')}
      </span>
      <button
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-sfxc-green hover:text-sfxc-green disabled:opacity-60"
      >
        {isLoggingOut ? 'Signing out...' : 'Sign Out'}
      </button>
    </div>
  );
}
