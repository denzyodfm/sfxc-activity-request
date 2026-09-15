'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import RequestDetails, { RequestDetailsData } from './RequestDetails';
import ApprovalCodeReceipt from './ApprovalCodeReceipt';
import WorkflowAttachments from './WorkflowAttachments';
import { PanelFooter, PanelHeader, RoleBadge, fieldControlClass, fieldLabelClass, panelClass } from './WorkflowPanel';

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
  fundSources,
  showRequestDetails = true,
  selectedSub
}: FundAvailabilityFormProps) {
  // The sub-account itself is picked inside the voucher sheet; this only
  // echoes the choice beside the decision it will be charged with.
  const selectedFundName = fundSources.find((source) => source.id === selectedSub)?.name;
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
    <form className={panelClass} onSubmit={handleSubmit}>
      <PanelHeader
        eyebrow="Your Decision"
        title="Fund Availability"
        description={request.particulars}
        aside={<RoleBadge tone="amber">Fund Officer</RoleBadge>}
      />

      <div className="space-y-5 p-5">
        {showRequestDetails ? <RequestDetails request={request} /> : null}

        <WorkflowAttachments attachments={request.attachments} />

        <div className="grid gap-5 md:grid-cols-2">
          <label className={fieldLabelClass}>
            Availability
            <select
              value={available}
              onChange={(event) => setAvailable(event.target.value as 'true' | 'false')}
              disabled={!canUpdate}
              className={fieldControlClass}
            >
              <option value="true">Available</option>
              <option value="false">Not Available</option>
            </select>
          </label>

          <div className={fieldLabelClass}>
            Fund Account
            <p className={`${fieldControlClass} font-semibold ${selectedFundName ? '' : 'text-amber-700'}`}>
              {selectedFundName ?? 'Select a sub-account in the voucher above'}
            </p>
          </div>
        </div>

        <label className={fieldLabelClass}>
          Remarks
          <textarea
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            disabled={!canUpdate}
            rows={3}
            placeholder="Optional remarks"
            className={fieldControlClass}
          />
        </label>

        <div ref={resultRef}>
          {status === 'success' && receipt ? (
            <ApprovalCodeReceipt
              message={message}
              approvalCode={receipt.approvalCode}
              approvedAt={receipt.approvedAt}
              onContinue={() => router.refresh()}
            />
          ) : status === 'error' ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{message}</div>
          ) : null}
        </div>
      </div>

      <PanelFooter hint="Confirm whether funds are available and charge the request to the selected sub-account.">
        <button type="submit" disabled={!canUpdate || !selectedSub || status === 'saving' || status === 'success'} className="sfxc-button">
          {status === 'saving' ? 'Updating...' : 'Update Availability'}
        </button>
      </PanelFooter>
    </form>
  );
}
