import { RequestDetailsData } from './RequestDetails';

export default function WorkflowAttachments({ attachments }: { attachments: RequestDetailsData['attachments'] }) {
  return (
    <div className="md:col-span-2">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Attachments</p>
      {attachments.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <a
              key={attachment.id}
              href={`/api/attachments/${attachment.id}`}
              target="_blank"
              rel="noreferrer"
              title={attachment.fileName}
              className="max-w-full truncate rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-sfxc-green hover:border-sfxc-green"
            >
              {attachment.fileName}
            </a>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-sm text-slate-500">No attachments uploaded.</p>
      )}
    </div>
  );
}
