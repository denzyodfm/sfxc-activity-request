import StatusBadge from './StatusBadge';
import { ActivityRequest } from '@prisma/client';

interface RequestCardProps {
  request: ActivityRequest & {
    department: { name: string };
    requestedBy: { name: string };
    attachments?: { id: string; fileName: string; fileUrl: string }[];
  };
}

export default function RequestCard({ request }: RequestCardProps) {
  return (
    <article className="sfxc-card p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">{request.controlNumber}</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">{request.particulars}</h3>
          <p className="mt-1 text-sm text-slate-600">{request.department.name} · {request.requestedBy.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={request.status} />
        </div>
      </div>
      {request.attachments && request.attachments.length > 0 ? (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Uploaded Files</p>
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
        </div>
      ) : null}
    </article>
  );
}
