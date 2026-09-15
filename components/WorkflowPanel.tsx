import { ReactNode } from 'react';

/**
 * The frame shared by every card in a request's review dialog — the voucher,
 * the remarks history and each role's decision form — so they line up at one
 * width with one header, footer and field style whichever approver opens them.
 *
 * Forms need their own <form> element as the card, so this exports the pieces
 * rather than a single wrapper.
 */
export const panelClass = 'sfxc-card text-left';

export const fieldLabelClass = 'block text-sm font-medium text-slate-700';

export const fieldControlClass =
  'mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sfxc-green focus:bg-white disabled:cursor-not-allowed disabled:opacity-60';

export function PanelHeader({
  eyebrow,
  title,
  description,
  aside
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{eyebrow}</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-900">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {aside ? <div className="flex shrink-0 flex-wrap items-center gap-2">{aside}</div> : null}
    </div>
  );
}

export function PanelFooter({ hint, children }: { hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-b-3xl border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500">{hint}</p>
      <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function RoleBadge({ children, tone }: { children: ReactNode; tone: 'emerald' | 'sky' | 'violet' | 'amber' }) {
  const tones = {
    emerald: 'bg-emerald-100 text-emerald-800',
    sky: 'bg-sky-100 text-sky-800',
    violet: 'bg-violet-100 text-violet-800',
    amber: 'bg-amber-100 text-amber-800'
  };
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}
