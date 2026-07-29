'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import RequestDetails, { RequestDetailsData } from './RequestDetails';
import ApprovalCodeReceipt from './ApprovalCodeReceipt';

interface ApprovalFormProps {
  requestId: string;
  request: RequestDetailsData;
  finalApproverLabel: string;
}

export default function ApprovalForm({ requestId, request, finalApproverLabel }: ApprovalFormProps) {
  const router = useRouter();
  const [decision, setDecision] = useState<'approve' | 'return' | 'deny'>('approve');
  const [remarks, setRemarks] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [receipt, setReceipt] = useState<{ approvalCode: string; approvedAt: string } | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (decision === 'return' && !window.confirm('Send this request back to the Endorser?')) return;
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
      if (data.approvalCode) {
        setReceipt({ approvalCode: data.approvalCode, approvedAt: data.approvedAt });
      } else {
        setReceipt(null);
        window.alert(data.message || 'Request sent back.');
        router.refresh();
      }
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
            onChange={(event) => setDecision(event.target.value as 'approve' | 'return' | 'deny')}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sfxc-green"
          >
            <option value="approve">Approve</option>
            <option value="return">Send Back to Endorser</option>
            <option value="deny">Deny</option>
          </select>
        </label>

        <label className="space-y-2 text-sm text-slate-700">
          Approval Remarks
          <textarea
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            required={decision === 'return'}
            rows={3}
            placeholder={decision === 'return' ? 'Explain what attachment, information, or correction is required.' : 'Optional remarks'}
            className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sfxc-green"
          />
        </label>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-500">Approve, deny, or send the request back to the endorser with a required explanation.</div>
        <button type="submit" disabled={status === 'saving' || status === 'success'} className="sfxc-button">
          {status === 'saving' ? 'Submitting...' : 'Submit Approval'}
        </button>
      </div>

      {status === 'success' && receipt ? (
        <ApprovalCodeReceipt
          message={message}
          approvalCode={receipt.approvalCode}
          approvedAt={receipt.approvedAt}
          onContinue={() => router.refresh()}
        />
      ) : status !== 'idle' ? (
        <div className={`mt-4 rounded-3xl border px-4 py-3 text-sm ${status === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
          {message}
        </div>
      ) : null}
    </form>
  );
}
