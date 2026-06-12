'use client';

import { ActivityRequest } from '@prisma/client';
import LogoMark from './LogoMark';

interface VoucherPrintProps {
  request: ActivityRequest & {
    department: { name: string };
    requestedBy: { name: string };
    approvedBy?: { name: string } | null;
    fundSource?: { name: string } | null;
    attachments: { id: string; fileName: string; fileUrl: string }[];
    approvals: { role: string; action: string; actor: { name: string; role: string } }[];
  };
  fallbackReviewerName?: string;
  fallbackEndorserName?: string;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-3 print:rounded-md print:p-2">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500 print:text-[9px]">{label}</p>
      <div className="mt-1 text-sm font-medium text-slate-900 print:text-[11px]">{children}</div>
    </div>
  );
}

export default function VoucherPrint({ request, fallbackReviewerName, fallbackEndorserName }: VoucherPrintProps) {
  const approverLabels: Record<string, string> = {
    APPROVER_JMAPC: 'JMAPC Approver',
    APPROVER_JCA: 'JCA Approver'
  };
  const reviewRecord = request.approvals.find((approval) => approval.role === 'REVIEWER' && approval.action === 'REVIEW_APPROVED');
  const endorsementRecord = request.approvals.find((approval) => approval.role === 'ENDORSER' && approval.action === 'ENDORSED');
  const reviewedByName =
    reviewRecord?.actor.role === 'REVIEWER' ? reviewRecord.actor.name : request.reviewRemarks ? fallbackReviewerName : null;
  const endorsedByName =
    endorsementRecord?.actor.role === 'ENDORSER' ? endorsementRecord.actor.name : request.endorsementRemarks ? fallbackEndorserName : null;
  const approvedByName = request.approvedBy?.name ?? (request.finalApprover ? approverLabels[request.finalApprover] : null);
  const handlePrintAttachment = (fileUrl: string) => {
    const printWindow = window.open(fileUrl, '_blank', 'noopener,noreferrer');

    if (printWindow) {
      printWindow.addEventListener('load', () => {
        printWindow.focus();
        printWindow.print();
      });
    }
  };

  return (
    <div className="space-y-4 print:space-y-0">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <div className="mb-4 text-center print:mb-2">
          <div className="mx-auto inline-block">
            <LogoMark size="sm" />
          </div>
          <p className="mt-1 text-xs uppercase tracking-[0.28em] text-slate-500 print:text-[9px]">Activity Request Voucher</p>
        </div>

        <div className="grid gap-3 md:grid-cols-4 print:grid-cols-4 print:gap-2">
          <Field label="Control No.">{request.controlNumber}</Field>
          <Field label="Date">{new Date(request.date).toLocaleDateString()}</Field>
          <Field label="Status">{request.status.replace(/_/g, ' ')}</Field>
          <Field label="Amount">PHP {Number(request.amount).toLocaleString()}</Field>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-3 print:mt-2 print:grid-cols-3 print:gap-2">
          <Field label="Department">{request.department.name}</Field>
          <Field label="Prepared By">{request.requestedBy.name}</Field>
          <Field label="Source of Fund">{request.fundSource?.name ?? 'TBD'}</Field>
        </div>

        <div className="mt-3 print:mt-2">
          <Field label="Particulars">
            <p className="line-clamp-4 whitespace-pre-wrap print:line-clamp-none">{request.particulars}</p>
          </Field>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-3 print:mt-2 print:grid-cols-3 print:gap-2">
          <Field label="Reviewed By">{reviewedByName ?? 'Pending'}</Field>
          <Field label="Endorsed By">{endorsedByName ?? 'Pending'}</Field>
          <Field label="Approved By">{approvedByName ?? 'Pending'}</Field>
        </div>

        <div className="mt-3 print:mt-2">
          <Field label="Uploaded Files">
            {request.attachments.length === 0 ? (
              <span>None</span>
            ) : (
              <div className="grid gap-2 md:grid-cols-2 print:grid-cols-2 print:gap-1">
                {request.attachments.slice(0, 8).map((attachment) => (
                  <div key={attachment.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 print:block print:border-0 print:p-0">
                    <a
                      href={attachment.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-sfxc-green hover:underline print:text-[10px]"
                    >
                      {attachment.fileName}
                    </a>
                    <div className="flex shrink-0 items-center gap-2 print:hidden">
                      <a
                        href={attachment.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-sfxc-green hover:text-sfxc-green"
                      >
                        View
                      </a>
                      <button
                        type="button"
                        onClick={() => handlePrintAttachment(attachment.fileUrl)}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-sfxc-green hover:border-sfxc-green"
                      >
                        Print
                      </button>
                    </div>
                  </div>
                ))}
                {request.attachments.length > 8 ? (
                  <span className="text-xs text-slate-500 print:text-[10px]">
                    +{request.attachments.length - 8} more file(s)
                  </span>
                ) : null}
              </div>
            )}
          </Field>
        </div>
      </div>

      <div className="print:hidden">
        <button type="button" onClick={() => window.print()} className="sfxc-button">
          Print Voucher
        </button>
      </div>
    </div>
  );
}
