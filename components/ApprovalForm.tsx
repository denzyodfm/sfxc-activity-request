'use client';

import { useState } from 'react';
import RequestDetails, { RequestDetailsData } from './RequestDetails';

interface ApprovalFormProps {
  requestId: string;
  request: RequestDetailsData;
  finalApproverLabel: string;
}

export default function ApprovalForm({ requestId, request, finalApproverLabel }: ApprovalFormProps) {
  const [decision, setDecision] = useState<'approve' | 'deny'>('approve');
  const [remarks, setRemarks] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('saving');
    setMessage('');

    try {
      const response = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, decision, remarks })
      });
      const data = await response.json();

      if (!response.ok) {
        setStatus('error');
        setMessage(data.error || 'Unable to complete approval.');
        return;
      }

      setStatus('success');
      setMessage(data.message || 'Approval decision recorded.');
    } catch (error) {
      setStatus('error');
      setMessage('Approval service unavailable.');
    }
  };

  return (
    <form className="sfxc-card p-6" onSubmit={handleSubmit}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Final Approval</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">{request.particulars}</h2>
          <p className="mt-1 text-sm text-slate-500">Assigned to {finalApproverLabel}</p>
        </div>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">Approver</span>
      </div>

      <RequestDetails request={request} />

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-700">
          Decision
          <select
            value={decision}
            onChange={(event) => setDecision(event.target.value as 'approve' | 'deny')}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sfxc-green"
          >
            <option value="approve">Approve</option>
            <option value="deny">Deny</option>
          </select>
        </label>

        <label className="space-y-2 text-sm text-slate-700">
          Approval Remarks
          <textarea
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            rows={3}
            className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sfxc-green"
          />
        </label>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-500">A final approval moves the request to For Voucher.</div>
        <button type="submit" className="sfxc-button">Submit Approval</button>
      </div>

      {status !== 'idle' && (
        <div className={`mt-4 rounded-3xl border px-4 py-3 text-sm ${status === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
          {message}
        </div>
      )}
    </form>
  );
}
