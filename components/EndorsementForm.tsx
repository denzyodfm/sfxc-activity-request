'use client';

import { useState } from 'react';
import RequestDetails, { RequestDetailsData } from './RequestDetails';

interface EndorsementFormProps {
  requestId: string;
  request: RequestDetailsData;
}

export default function EndorsementForm({ requestId, request }: EndorsementFormProps) {
  const [approver, setApprover] = useState<'APPROVER_JMAPC' | 'APPROVER_JCA'>('APPROVER_JMAPC');
  const [remarks, setRemarks] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('saving');
    setMessage('');

    try {
      const response = await fetch('/api/endorsements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, approver, remarks })
      });
      const data = await response.json();

      if (!response.ok) {
        setStatus('error');
        setMessage(data.error || 'Unable to endorse request.');
        return;
      }

      setStatus('success');
      setMessage(data.message || 'Request endorsed successfully.');
    } catch (error) {
      setStatus('error');
      setMessage('Endorsement service unavailable.');
    }
  };

  return (
    <form className="sfxc-card p-6" onSubmit={handleSubmit}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Endorse Request</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">{request.particulars}</h2>
        </div>
        <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-800">Endorser</span>
      </div>

      <RequestDetails request={request} />

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-700">
          Choose Approver
          <select
            value={approver}
            onChange={(event) => setApprover(event.target.value as 'APPROVER_JMAPC' | 'APPROVER_JCA')}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sfxc-green"
          >
            <option value="APPROVER_JMAPC">JMAPC</option>
            <option value="APPROVER_JCA">JCA</option>
          </select>
        </label>

        <label className="space-y-2 text-sm text-slate-700">
          Endorsement Remarks
          <textarea
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            rows={3}
            className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sfxc-green"
          />
        </label>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-500">Select the correct final approver before moving to approval stage.</div>
        <button type="submit" className="sfxc-button">Endorse Request</button>
      </div>

      {status !== 'idle' && (
        <div className={`mt-4 rounded-3xl border px-4 py-3 text-sm ${status === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
          {message}
        </div>
      )}
    </form>
  );
}
