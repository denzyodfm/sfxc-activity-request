'use client';

import { useState } from 'react';
import RequestDetails, { RequestDetailsData } from './RequestDetails';

interface FundAvailabilityFormProps {
  requestId: string;
  request: RequestDetailsData;
  fundSourceId: string | null;
  fundSources: { id: string; name: string }[];
}

export default function FundAvailabilityForm({ requestId, request, fundSourceId, fundSources }: FundAvailabilityFormProps) {
  const [selectedSource, setSelectedSource] = useState(fundSourceId ?? fundSources[0]?.id ?? '');
  const [available, setAvailable] = useState<'true' | 'false'>('true');
  const [remarks, setRemarks] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const canUpdate = request.status === 'FOR_FUND_AVAILABILITY';

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

      <RequestDetails request={request} />

      {!canUpdate ? (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          This request is already past fund availability review.
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-700">
          Source of Fund
          <select
            value={selectedSource}
            onChange={(event) => setSelectedSource(event.target.value)}
            disabled={!canUpdate}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sfxc-green"
          >
            {fundSources.map((source) => (
              <option key={source.id} value={source.id}>{source.name}</option>
            ))}
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
        <div className="text-sm text-slate-500">Completing this step moves the request to review or denies it.</div>
        <button type="submit" disabled={!canUpdate || status === 'saving'} className="sfxc-button">
          {status === 'saving' ? 'Updating...' : 'Update Availability'}
        </button>
      </div>

      {status !== 'idle' && (
        <div className={`mt-4 rounded-3xl border px-4 py-3 text-sm ${status === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
          {message}
        </div>
      )}
    </form>
  );
}
