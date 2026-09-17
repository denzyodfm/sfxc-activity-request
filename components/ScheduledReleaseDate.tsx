'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { releaseDateInputValue } from '@/lib/release-date';

export default function ScheduledReleaseDate({ requestId, initialDate }: { requestId: string; initialDate: Date | string | null }) {
  const router = useRouter();
  const [date, setDate] = useState(releaseDateInputValue(initialDate));
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const save = async () => {
    setStatus('saving');
    setMessage('');
    try {
      const response = await fetch(`/api/vouchers/${requestId}/release-date`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledReleaseDate: date })
      });
      const data = await response.json();
      setStatus(response.ok ? 'success' : 'error');
      setMessage(response.ok ? data.message : data.error || 'Unable to save release date.');
      if (response.ok) router.refresh();
    } catch {
      setStatus('error');
      setMessage('Unable to reach the voucher service.');
    }
  };

  return (
    <div className="space-y-3">
      <label htmlFor={`release-date-${requestId}`} className="block text-sm font-medium text-slate-700">Scheduled fund release date</label>
      <div className="flex flex-wrap items-center gap-3">
        <input id={`release-date-${requestId}`} type="date" value={date} onChange={(event) => { setDate(event.target.value); setStatus('idle'); }} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 focus:border-sfxc-green focus:outline-none focus:ring-2 focus:ring-sfxc-green/20" />
        <button type="button" onClick={save} disabled={status === 'saving'} className="sfxc-button">{status === 'saving' ? 'Saving...' : 'Save Release Date'}</button>
      </div>
      <p className="text-xs text-slate-500">This date can be changed until the voucher is completed.</p>
      {message ? <p role="status" className={`text-sm ${status === 'error' ? 'text-rose-700' : 'text-emerald-700'}`}>{message}</p> : null}
    </div>
  );
}
