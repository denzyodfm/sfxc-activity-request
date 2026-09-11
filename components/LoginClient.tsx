'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LogoMark from '@/components/LogoMark';
import { useSession } from '@/lib/session-context';
import { DemoAccount } from '@/lib/demo-accounts';

export default function LoginClient({ demoAccounts }: { demoAccounts: DemoAccount[] }) {
  const router = useRouter();
  const { setUser } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();

      if (!response.ok) {
        setStatus('error');
        setMessage(data.error || 'Login failed.');
        return;
      }

      setStatus('success');
      setMessage('Login successful. Redirecting...');
      setUser(data.user);
      const roleDestinations: Record<string, string> = {
        FUND_OFFICER: '/fund-availability',
        REVIEWER: '/reviewer',
        ENDORSER: '/endorsement',
        APPROVER_JMAPC: '/approval?approver=APPROVER_JMAPC',
        APPROVER_JCA: '/approval?approver=APPROVER_JCA'
      };
      const destination = roleDestinations[data.user.role] ?? '/';
      router.replace(destination);
    } catch (error) {
      setStatus('error');
      setMessage('Authentication service unavailable.');
    }
  };

  // Fills the form rather than signing straight in, so the credentials being
  // demonstrated are the ones actually submitted.
  const fillDemoAccount = (account: DemoAccount) => {
    setEmail(account.email);
    setPassword(account.password);
    setStatus('idle');
    setMessage('');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sfxc-green to-slate-900 px-4 py-10">
      <div className="w-full max-w-md space-y-8 rounded-3xl bg-white p-8 shadow-xl">
        <div className="text-center">
          <LogoMark />
          <h1 className="mt-4 whitespace-nowrap text-2xl font-semibold text-slate-900">Activity Request System</h1>
          <p className="mt-2 text-sm text-slate-600">St. Francis Xavier College</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <label className="block text-sm text-slate-700">
            Email Address
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="user@sfxc.edu"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sfxc-green focus:bg-white"
              required
            />
          </label>
          <label className="block text-sm text-slate-700">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sfxc-green focus:bg-white"
              required
            />
          </label>

          <button type="submit" disabled={status === 'loading'} className="sfxc-button w-full">
            {status === 'loading' ? 'Signing in...' : 'Sign In'}
          </button>

          {status !== 'idle' && (
            <div className={`rounded-3xl border px-4 py-3 text-sm ${status === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
              {message}
            </div>
          )}
        </form>

        {demoAccounts.length > 0 ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-800">Demo Accounts</p>
            <p className="mt-1 text-xs text-amber-800">
              Anyone who opens this page can read these. Turn the panel off in Admin Settings → Demo &amp; Data before
              this system carries real requests.
            </p>
            <ul className="mt-3 space-y-1">
              {demoAccounts.map((account) => (
                <li key={account.email}>
                  <button
                    type="button"
                    onClick={() => fillDemoAccount(account)}
                    className="flex w-full flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-xl px-2 py-1.5 text-left transition hover:bg-amber-100"
                    title="Fill the form with these credentials"
                  >
                    <span className="font-mono text-xs text-slate-800">{account.email}</span>
                    <span className="font-mono text-xs font-semibold text-slate-900">{account.password}</span>
                    {account.role ? (
                      <span className="ml-auto text-[10px] uppercase tracking-wide text-amber-700">{account.role}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
