'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RequestDetailsData } from './RequestDetails';
import ApprovalCodeReceipt from './ApprovalCodeReceipt';
import WorkflowAttachments from './WorkflowAttachments';
import { PanelFooter, PanelHeader, RoleBadge, fieldControlClass, fieldLabelClass, panelClass } from './WorkflowPanel';

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
    <form className={panelClass} onSubmit={handleSubmit}>
      <PanelHeader
        eyebrow="Your Decision"
        title="Final Approval"
        description={request.particulars}
        aside={<RoleBadge tone="emerald">Approver</RoleBadge>}
      />

      <div className="space-y-5 p-5">
        <WorkflowAttachments attachments={request.attachments} />

        <div className="grid gap-5 md:grid-cols-2">
          <label className={fieldLabelClass}>
            Decision
            <select
              value={decision}
              onChange={(event) => setDecision(event.target.value as 'approve' | 'return' | 'deny')}
              className={fieldControlClass}
            >
              <option value="approve">Approve</option>
              <option value="return">Send Back to Endorser</option>
              <option value="deny">Deny</option>
            </select>
          </label>

          <div className={fieldLabelClass}>
            Assigned Approver
            <p className={`${fieldControlClass} font-semibold`}>{finalApproverLabel}</p>
          </div>
        </div>

        <label className={fieldLabelClass}>
          Remarks
          <textarea
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            required={decision === 'return'}
            rows={3}
            placeholder={decision === 'return' ? 'Explain what attachment, information, or correction is required.' : 'Optional remarks'}
            className={fieldControlClass}
          />
        </label>

        {status === 'success' && receipt ? (
          <ApprovalCodeReceipt
            message={message}
            approvalCode={receipt.approvalCode}
            approvedAt={receipt.approvedAt}
            onContinue={() => router.refresh()}
          />
        ) : status !== 'idle' ? (
          <div className={`rounded-3xl border px-4 py-3 text-sm ${status === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
            {message}
          </div>
        ) : null}
      </div>

      <PanelFooter hint="Approve, deny, or send the request back to the Endorser with a required explanation.">
        <button type="submit" disabled={status === 'saving' || status === 'success'} className="sfxc-button">
          {status === 'saving' ? 'Submitting...' : 'Submit Approval'}
        </button>
      </PanelFooter>
    </form>
  );
}
