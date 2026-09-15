'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RequestDetailsData } from './RequestDetails';
import ApprovalCodeReceipt from './ApprovalCodeReceipt';
import WorkflowAttachments from './WorkflowAttachments';
import { PanelFooter, PanelHeader, RoleBadge, fieldControlClass, fieldLabelClass, panelClass } from './WorkflowPanel';

interface EndorsementFormProps {
  requestId: string;
  request: RequestDetailsData;
}

export default function EndorsementForm({ requestId, request }: EndorsementFormProps) {
  const router = useRouter();
  const [decision, setDecision] = useState<'endorse' | 'return'>('endorse');
  const [approver, setApprover] = useState<'APPROVER_JMAPC' | 'APPROVER_JCA'>('APPROVER_JMAPC');
  const [remarks, setRemarks] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [receipt, setReceipt] = useState<{ approvalCode: string; approvedAt: string } | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (decision === 'return' && !window.confirm('Send this request back to the Reviewer?')) return;
    setStatus('saving');
    setMessage('');

    try {
      const response = await fetch('/api/endorsements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, decision, approver, remarks })
      });
      const data = await response.json();

      if (!response.ok) {
        setStatus('error');
        setMessage(data.error || 'Unable to endorse request.');
        return;
      }

      setStatus('success');
      setMessage(data.message || 'Request endorsed successfully.');
      if (data.approvalCode) {
        setReceipt({ approvalCode: data.approvalCode, approvedAt: data.approvedAt });
      } else {
        setReceipt(null);
        window.alert(data.message || 'Request sent back.');
        router.refresh();
      }
    } catch (error) {
      setStatus('error');
      setMessage('Endorsement service unavailable.');
    }
  };

  return (
    <form className={panelClass} onSubmit={handleSubmit}>
      <PanelHeader
        eyebrow="Your Decision"
        title="Endorse Request"
        description={request.particulars}
        aside={<RoleBadge tone="violet">Endorser</RoleBadge>}
      />

      <div className="space-y-5 p-5">
        <WorkflowAttachments attachments={request.attachments} />

        <div className="grid gap-5 md:grid-cols-2">
          <label className={fieldLabelClass}>
            Decision
            <select
              value={decision}
              onChange={(event) => setDecision(event.target.value as 'endorse' | 'return')}
              className={fieldControlClass}
            >
              <option value="endorse">Endorse</option>
              <option value="return">Send Back to Reviewer</option>
            </select>
          </label>

          <label className={fieldLabelClass}>
            Choose Approver
            <select
              value={approver}
              onChange={(event) => setApprover(event.target.value as 'APPROVER_JMAPC' | 'APPROVER_JCA')}
              disabled={decision === 'return'}
              className={fieldControlClass}
            >
              <option value="APPROVER_JMAPC">JMAPC</option>
              <option value="APPROVER_JCA">JCA</option>
            </select>
          </label>
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

      <PanelFooter hint="Endorse the request to a final approver, or send it back to the Reviewer with a required explanation.">
        <button type="submit" disabled={status === 'saving' || status === 'success'} className="sfxc-button">
          {status === 'saving' ? 'Saving...' : decision === 'return' ? 'Send Back' : 'Endorse Request'}
        </button>
      </PanelFooter>
    </form>
  );
}
