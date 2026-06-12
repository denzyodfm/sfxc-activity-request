export interface RequestDetailsData {
  controlNumber: string;
  date: string;
  departmentName: string;
  requestedByName: string;
  particulars: string;
  amount: number;
  status: string;
  fundSourceName?: string | null;
  attachments: { id: string; fileName: string; fileUrl: string }[];
}

interface RequestDetailsProps {
  request: RequestDetailsData;
}

export default function RequestDetails({ request }: RequestDetailsProps) {
  const displayStatus = request.status.replace(/_/g, ' ');

  return (
    <div className="mt-5 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="grid gap-3 md:grid-cols-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Control No.</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{request.controlNumber}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Department</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{request.departmentName}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Requested By</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{request.requestedByName}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Date</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{new Date(request.date).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Amount</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">PHP {request.amount.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Source of Fund</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{request.fundSourceName ?? 'Not assigned yet'}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Status</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{displayStatus}</p>
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Particulars</p>
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{request.particulars}</p>
      </div>

      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Attachments</p>
        {request.attachments.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No attachments uploaded.</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {request.attachments.map((attachment) => (
              <a
                key={attachment.id}
                href={attachment.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-sfxc-green hover:border-sfxc-green"
              >
                {attachment.fileName}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
