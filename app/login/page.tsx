'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LogoMark from '@/components/LogoMark';

export default function LoginPage() {
  const router = useRouter();
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
      setTimeout(() => router.push('/'), 1500);
    } catch (error) {
      setStatus('error');
      setMessage('Authentication service unavailable.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sfxc-green to-slate-900 px-4">
      <div className="w-full max-w-md space-y-8 rounded-3xl bg-white p-8 shadow-xl">
        <div className="text-center">
          <LogoMark />
          <h1 className="mt-4 text-3xl font-semibold text-slate-900">SFXC Activity Request System</h1>
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

        <div className="rounded-3xl bg-slate-50 p-4">
          <p className="text-xs text-slate-600">Demo Accounts:</p>
          <p className="mt-1 text-xs font-semibold text-slate-700">Password for demo accounts: password</p>
          <p className="mt-2 text-xs text-slate-700">
            <strong>Admin:</strong> admin@sfxc.edu
            <br />
            <strong>Requestor:</strong> nina.reyes@sfxc.edu
            <br />
            <strong>Fund Officer:</strong> marcos.dc@sfxc.edu
            <br />
            <strong>Reviewer:</strong> liza.santos@sfxc.edu
            <br />
            <strong>Endorser:</strong> rafael.bautista@sfxc.edu
            <br />
            <strong>JMAPC:</strong> jmapc@sfxc.edu
            <br />
            <strong>JCA:</strong> jca@sfxc.edu
          </p>
        </div>
      </div>
    </div>
  );
}
