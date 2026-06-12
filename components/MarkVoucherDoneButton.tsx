'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MarkVoucherDoneButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleClick = async () => {
    const confirmed = window.confirm('Mark this voucher as done printing?');
    if (!confirmed) return;

    setStatus('saving');
    setMessage('');

    try {
      const response = await fetch('/api/vouchers/done', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId })
      });
      const data = await response.json();

      if (!response.ok) {
        setStatus('error');
        setMessage(data.error || 'Unable to mark voucher as done.');
        return;
      }

      router.refresh();
    } catch (error) {
      setStatus('error');
      setMessage('Voucher service unavailable.');
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={status === 'saving'}
        className="sfxc-button-secondary"
      >
        {status === 'saving' ? 'Marking Done...' : 'Done Printing'}
      </button>
      {status === 'error' ? <p className="text-sm text-rose-600">{message}</p> : null}
    </div>
  );
}
