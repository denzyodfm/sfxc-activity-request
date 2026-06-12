const statusStyles: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  FOR_FUND_AVAILABILITY: 'bg-amber-100 text-amber-800',
  FOR_REVIEW: 'bg-sky-100 text-sky-800',
  FOR_ENDORSEMENT: 'bg-violet-100 text-violet-800',
  FOR_APPROVAL: 'bg-emerald-100 text-emerald-800',
  APPROVED: 'bg-emerald-500 text-white',
  DENIED: 'bg-rose-500 text-white',
  PRINTED: 'bg-slate-700 text-white',
  DONE: 'bg-slate-700 text-white'
};

export default function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[status] ?? 'bg-slate-100 text-slate-700'}`}>{status.replace(/_/g, ' ')}</span>;
}
