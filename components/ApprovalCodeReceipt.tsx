'use client';

interface ApprovalCodeReceiptProps {
  message: string;
  approvalCode: string;
  approvedAt: string;
  onContinue: () => void;
}

export default function ApprovalCodeReceipt({
  message,
  approvalCode,
  approvedAt,
  onContinue
}: ApprovalCodeReceiptProps) {
  return (
    <div className="mt-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
      <p className="text-sm font-semibold">{message}</p>
      <div className="mt-4 rounded-2xl border border-emerald-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Approving Code</p>
        <p className="mt-2 font-mono text-2xl font-bold tracking-[0.18em] text-slate-950">{approvalCode}</p>
        <p className="mt-2 text-xs text-slate-500">Approved {new Date(approvedAt).toLocaleString()}</p>
      </div>
      <button type="button" onClick={onContinue} className="sfxc-button mt-4">
        Continue
      </button>
    </div>
  );
}
