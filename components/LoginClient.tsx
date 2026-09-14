'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LogoMark from '@/components/LogoMark';
import { useSession } from '@/lib/session-context';
import { DemoAccount } from '@/lib/demo-accounts';

/** Where the remembered email address is kept, per browser. */
const REMEMBERED_EMAIL_KEY = 'sfxc.rememberedEmail';

export default function LoginClient({ demoAccounts }: { demoAccounts: DemoAccount[] }) {
  const router = useRouter();
  const { setUser } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  // Reading storage can throw outright in a private window or with site data
  // blocked, so a failure here must not stop the form rendering.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(REMEMBERED_EMAIL_KEY);
      if (saved) {
        setEmail(saved);
        setRemember(true);
      }
    } catch {
      // No remembered address available; the form just starts empty.
    }
  }, []);

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

      // Only remember an address that actually signed in, so a typo is never
      // the thing that comes back next time.
      try {
        if (remember) {
          window.localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim());
        } else {
          window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
        }
      } catch {
        // Storage unavailable; signing in still succeeds.
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
            {/* name and autoComplete are what let the browser's own password
                manager recognise this as a sign-in form and offer to save. */}
            <input
              type="email"
              name="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="user@sfxc.edu"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sfxc-green focus:bg-white"
              required
            />
          </label>
          {/* The toggle is a sibling of the input, not nested inside the
              <label>. A button inside a label that wraps a control has its
              click redirected to that control, so the toggle never fired. */}
          <div className="text-sm text-slate-700">
            <label htmlFor="login-password" className="block">
              Password
            </label>
            <span className="relative mt-2 block">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-4 pr-12 text-sm text-slate-900 outline-none transition focus:border-sfxc-green focus:bg-white"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                title={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-2xl text-slate-500 transition hover:text-sfxc-green focus:outline-none focus-visible:ring-2 focus-visible:ring-sfxc-green"
              >
                {showPassword ? (
                  // Eye with a slash: the password is currently visible.
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.6 10.6a2 2 0 002.8 2.8" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.8 6.8C4.7 8.1 3.2 10 2.5 12c1.3 3.5 5 6 9.5 6 1.6 0 3.1-.3 4.4-.9M9.9 5.2A10 10 0 0112 5c4.5 0 8.2 2.5 9.5 6-.5 1.4-1.4 2.7-2.6 3.7" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12C3.8 8.5 7.5 6 12 6s8.2 2.5 9.5 6c-1.3 3.5-5 6-9.5 6s-8.2-2.5-9.5-6Z" />
                    <circle cx="12" cy="12" r="2.5" />
                  </svg>
                )}
              </button>
            </span>
          </div>

          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sfxc-green focus:ring-sfxc-green"
            />
            <span>
              <span className="font-semibold">Remember me on this computer</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Fills in your email next time. Your browser will offer to save the password itself — leave this off on a
                shared computer.
              </span>
            </span>
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
