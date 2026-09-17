import { VoucherRequestData } from './VoucherPrint';
import { PanelHeader, panelClass } from './WorkflowPanel';

export default function WorkflowHistory({ request }: { request: VoucherRequestData }) {
  const remarksHistory = [
    ...(request.preApprovalNotes?.trim() ? [{
      key: 'request-notes', role: 'REQUESTOR', action: 'REQUEST_SUBMITTED',
      actor: request.requestedBy.name, remarks: request.preApprovalNotes, createdAt: request.date
    }] : []),
    ...request.approvals.filter((item) => item.remarks?.trim()).map((item, index) => ({
      key: `${item.role}-${item.action}-${new Date(item.createdAt).toISOString()}-${index}`,
      role: item.role, action: item.action, actor: item.actor.name,
      remarks: item.remarks as string, createdAt: item.createdAt
    }))
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return <section className={`${panelClass} print:hidden`} aria-label="Comments, notes and remarks">
    <PanelHeader eyebrow="Workflow History" title="Comments, Notes and Remarks" aside={<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{remarksHistory.length} {remarksHistory.length === 1 ? 'entry' : 'entries'}</span>} />
    <div className="p-5">
      {remarksHistory.length === 0 ? <p className="text-sm text-slate-500">No notes or remarks have been added yet.</p> : <ol className="space-y-3">
        {remarksHistory.map((item) => <li key={item.key} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sfxc-green">{item.role.replace(/_/g, ' ')} · {item.action.replace(/_/g, ' ')}</p>
            <time className="text-xs text-slate-500" dateTime={new Date(item.createdAt).toISOString()}>{new Date(item.createdAt).toLocaleString()}</time>
          </div>
          <p className="mt-1 text-xs font-medium text-slate-600">{item.actor}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{item.remarks}</p>
        </li>)}
      </ol>}
    </div>
  </section>;
}
