'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import RequestDetails, { RequestDetailsData } from './RequestDetails';
import ApprovalCodeReceipt from './ApprovalCodeReceipt';

interface FundAvailabilityFormProps {
  requestId: string;
  request: RequestDetailsData;
  fundSourceId: string | null;
  fundSources: { id: string; name: string; parentId: string | null; balance: number }[];
  showRequestDetails?: boolean;
  selectedSub: string;
}

export default function FundAvailabilityForm({
  requestId,
  request,
  showRequestDetails = true,
  selectedSub
}: FundAvailabilityFormProps) {
  const router = useRouter();
  const [available, setAvailable] = useState<'true' | 'false'>('true');
  const [remarks, setRemarks] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [receipt, setReceipt] = useState<{ approvalCode: string; approvedAt: string } | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const canUpdate = request.status === 'FOR_FUND_AVAILABILITY';

  useEffect(() => {
    if (status === 'success' || status === 'error') {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [status]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canUpdate) return;
    setStatus('saving');
    setMessage('');

    try {
      const response = await fetch('/api/funding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          fundSourceId: selectedSub,
          fundAvailable: available === 'true',
          remarks
        })
      });
      const data = await response.json();
      if (!response.ok) {
        setStatus('error');
        setMessage(data.error || 'Unable to update availability.');
        return;
      }
      setStatus('success');
      setMessage(data.message || 'Fund availability updated.');
      setReceipt({ approvalCode: data.approvalCode, approvedAt: data.approvedAt });
    } catch {
      setStatus('error');
      setMessage('Fund service unavailable.');
    }
  };

  return (
    <form className="sfxc-card grid gap-3 p-3 md:grid-cols-[180px_1fr_auto] md:items-end" onSubmit={handleSubmit}>

      {showRequestDetails ? <RequestDetails request={request} /> : null}

      <div className="md:col-span-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Attachments</p>
        {request.attachments.length ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {request.attachments.map((attachment) => (
              <a
                key={attachment.id}
                href={`/api/attachments/${attachment.id}`}
                target="_blank"
                rel="noreferrer"
                className="max-w-full truncate rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-sfxc-green hover:border-sfxc-green"
                title={attachment.fileName}
              >
                {attachment.fileName}
              </a>
            ))}
          </div>
        ) : <p className="mt-1 text-sm text-slate-500">No attachments uploaded.</p>}
      </div>

      <label className="block space-y-1 text-sm text-slate-700">
        Availability
        <select
          value={available}
          onChange={(event) => setAvailable(event.target.value as 'true' | 'false')}
          disabled={!canUpdate}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sfxc-green"
        >
          <option value="true">Available</option>
          <option value="false">Not Available</option>
        </select>
      </label>

      <label className="block text-sm text-slate-700">
        Remarks
        <textarea
          value={remarks}
          onChange={(event) => setRemarks(event.target.value)}
          disabled={!canUpdate}
          rows={1}
          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sfxc-green"
        />
      </label>

      <div>
        <button type="submit" disabled={!canUpdate || !selectedSub || status === 'saving' || status === 'success'} className="sfxc-button">
          {status === 'saving' ? 'Updating...' : 'Update Availability'}
        </button>
      </div>

      <div ref={resultRef} className="md:col-span-3">
        {status === 'success' && receipt ? (
          <ApprovalCodeReceipt
            message={message}
            approvalCode={receipt.approvalCode}
            approvedAt={receipt.approvedAt}
            onContinue={() => router.refresh()}
          />
        ) : status === 'error' ? (
          <div className="mt-4 rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{message}</div>
        ) : null}
      </div>
    </form>
  );
}
