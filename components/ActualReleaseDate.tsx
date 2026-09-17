'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { releaseDateInputValue } from '@/lib/release-date';
import MarkVoucherDoneButton from './MarkVoucherDoneButton';

export default function ActualReleaseDate({ requestId, initialDate }: { requestId: string; initialDate: Date | string | null }) {
  const router = useRouter();
  const [date, setDate] = useState(releaseDateInputValue(initialDate));
  const [savedDate, setSavedDate] = useState(releaseDateInputValue(initialDate));
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const save = async () => {
    setStatus('saving');
    setMessage('');
    try {
      const response = await fetch(`/api/vouchers/${requestId}/actual-release-date`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actualReleaseDate: date })
      });
      const data = await response.json();
      setStatus(response.ok ? 'success' : 'error');
      setMessage(response.ok ? data.message : data.error || 'Unable to save the actual release date.');
      if (response.ok) {
        setSavedDate(date);
        router.refresh();
      }
    } catch {
      setStatus('error');
      setMessage('Unable to reach the voucher service.');
    }
  };

  return <div className="space-y-4">
    <div>
      <label htmlFor={`actual-release-date-${requestId}`} className="block text-sm font-medium text-slate-700">Actual fund release date</label>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <input id={`actual-release-date-${requestId}`} type="date" value={date} onChange={(event) => { setDate(event.target.value); setStatus('idle'); }} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 focus:border-sfxc-green focus:outline-none focus:ring-2 focus:ring-sfxc-green/20" />
        <button type="button" onClick={save} disabled={status === 'saving' || date === savedDate} className="sfxc-button">{status === 'saving' ? 'Saving...' : 'Save Actual Release'}</button>
      </div>
      <p className="mt-2 text-xs text-slate-500">Record the date funds were released. Save it to enable voucher completion.</p>
      {message ? <p role="status" className={`mt-2 text-sm ${status === 'error' ? 'text-rose-700' : 'text-emerald-700'}`}>{message}</p> : null}
    </div>
    {savedDate && date === savedDate ? <MarkVoucherDoneButton requestId={requestId} /> : null}
  </div>;
}
