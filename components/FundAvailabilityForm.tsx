'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import RequestDetails, { RequestDetailsData } from './RequestDetails';
import { formatMoney } from '@/lib/money';
import ApprovalCodeReceipt from './ApprovalCodeReceipt';

interface FundAvailabilityFormProps {
  requestId: string;
  request: RequestDetailsData;
  fundSourceId: string | null;
  fundSources: { id: string; name: string; parentId: string | null; balance: number }[];
  showRequestDetails?: boolean;
}

export default function FundAvailabilityForm({ requestId, request, fundSourceId, fundSources, showRequestDetails = true }: FundAvailabilityFormProps) {
  const router = useRouter();
  const mainAccounts = fundSources.filter((source) => !source.parentId);
  const existingSource = fundSources.find((source) => source.id === fundSourceId);
  const initialMainId = existingSource?.parentId ?? existingSource?.id ?? mainAccounts[0]?.id ?? '';
  const initialSubId = existingSource?.parentId ? existingSource.id : '';
  const [selectedMain, setSelectedMain] = useState(initialMainId);
  const [selectedSub, setSelectedSub] = useState(initialSubId);
  const [available, setAvailable] = useState<'true' | 'false'>('true');
  const [remarks, setRemarks] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [receipt, setReceipt] = useState<{ approvalCode: string; approvedAt: string } | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const canUpdate = request.status === 'FOR_FUND_AVAILABILITY';
  const subAccounts = fundSources.filter((source) => source.parentId === selectedMain);
  const selectedSource = selectedSub || selectedMain;

  useEffect(() => {
    if (status === 'success' || status === 'error') {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [status]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canUpdate) {
      return;
    }
    setStatus('saving');
    setMessage('');

    try {
      const response = await fetch('/api/funding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          fundSourceId: selectedSource,
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
    } catch (error) {
      setStatus('error');
      setMessage('Fund service unavailable.');
    }
  };

  return (
    <form className="sfxc-card p-6" onSubmit={handleSubmit}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Request</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">{request.particulars}</h2>
        </div>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">Fund Availability</span>
      </div>

      {showRequestDetails ? <RequestDetails request={request} /> : null}

      {!canUpdate ? (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          This request is already past fund availability review.
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <label className="space-y-2 text-sm text-slate-700">
          Main Account
          <select
            value={selectedMain}
            onChange={(event) => {
              const mainId = event.target.value;
              setSelectedMain(mainId);
              setSelectedSub(fundSources.find((source) => source.parentId === mainId)?.id ?? '');
            }}
            disabled={!canUpdate}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sfxc-green"
          >
            {mainAccounts.map((source) => (
              <option key={source.id} value={source.id}>{source.name} - {formatMoney(source.balance)}</option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm text-slate-700">
          Sub-Account
          <select
            value={selectedSub}
            onChange={(event) => setSelectedSub(event.target.value)}
            disabled={!canUpdate || subAccounts.length === 0}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sfxc-green disabled:opacity-60"
          >
            {subAccounts.length === 0 ? (
              <option value="">No sub-accounts — use main account</option>
            ) : (
              <>
                <option value="">Use main account</option>
                {subAccounts.map((source) => (
                  <option key={source.id} value={source.id}>{source.name} - {formatMoney(source.balance)}</option>
                ))}
              </>
            )}
          </select>
        </label>

        <label className="space-y-2 text-sm text-slate-700">
          Availability
          <select
            value={available}
            onChange={(event) => setAvailable(event.target.value as 'true' | 'false')}
            disabled={!canUpdate}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sfxc-green"
          >
            <option value="true">Available</option>
            <option value="false">Not Available</option>
          </select>
        </label>
      </div>

      <label className="mt-4 block text-sm text-slate-700">
        Remarks
        <textarea
          value={remarks}
          onChange={(event) => setRemarks(event.target.value)}
          disabled={!canUpdate}
          rows={3}
          className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sfxc-green"
        />
      </label>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm text-slate-500">Completing this step moves the request to review or denies it.</div>
          {status === 'saving' ? (
            <p className="mt-1 text-sm font-semibold text-sfxc-green" role="status">
              Assigning source of fund…
            </p>
          ) : null}
        </div>
        <button type="submit" disabled={!canUpdate || status === 'saving' || status === 'success'} className="sfxc-button">
          {status === 'saving' ? 'Updating...' : 'Update Availability'}
        </button>
      </div>

      <div ref={resultRef}>
        {status === 'success' && receipt ? (
          <ApprovalCodeReceipt
            message={message}
            approvalCode={receipt.approvalCode}
            approvedAt={receipt.approvedAt}
            onContinue={() => router.refresh()}
          />
        ) : status === 'error' ? (
          <div className="mt-4 rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
            {message}
          </div>
        ) : null}
      </div>
    </form>
  );
}
