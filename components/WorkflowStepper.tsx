const steps = [
  { status: 'FOR_FUND_AVAILABILITY', label: 'Fund Availability' },
  { status: 'FOR_REVIEW', label: 'Review' },
  { status: 'FOR_ENDORSEMENT', label: 'Endorsement' },
  { status: 'FOR_APPROVAL', label: 'Approval' },
  { status: 'APPROVED', label: 'Finalized' }
];

export default function WorkflowStepper({ current }: { current: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Workflow</h2>
      <div className="mt-4 space-y-4">
        {steps.map((step, index) => {
          const active = steps.findIndex((item) => item.status === current) >= index;
          return (
            <div key={step.status} className="flex items-center gap-4">
              <div className={`flex h-9 w-9 items-center justify-center rounded-2xl ${active ? 'bg-sfxc-green text-white' : 'bg-slate-100 text-slate-500'}`}>
                {index + 1}
              </div>
              <div>
                <p className={`text-sm font-semibold ${active ? 'text-slate-900' : 'text-slate-500'}`}>{step.label}</p>
                <p className="text-xs text-slate-400">{step.status.replace(/_/g, ' ')}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
