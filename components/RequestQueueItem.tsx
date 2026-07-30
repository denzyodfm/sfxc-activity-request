'use client';

import { ReactNode, useState } from 'react';
import { RequestDetailsData } from './RequestDetails';
import { formatMoney } from '@/lib/money';

interface RequestQueueItemProps {
  request: RequestDetailsData;
  actionLabel?: string;
  children: ReactNode;
}

export default function RequestQueueItem({ request, actionLabel = 'View Request', children }: RequestQueueItemProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <article className="sfxc-card overflow-hidden">
        <div className="grid gap-4 p-5 text-sm md:grid-cols-[130px_140px_1fr_1fr_140px_auto] md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Request Date</p>
            <p className="mt-1 font-semibold text-slate-900">{new Date(request.date).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Request No.</p>
            <p className="mt-1 font-semibold text-slate-900">{request.controlNumber}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Department</p>
            <p className="mt-1 font-semibold text-slate-900">{request.departmentName}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Requested By</p>
            <p className="mt-1 font-semibold text-slate-900">{request.requestedByName}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Amount</p>
            <p className="mt-1 font-semibold text-slate-900">{formatMoney(request.amount)}</p>
          </div>
          <button type="button" onClick={() => setOpen(true)} className="sfxc-button whitespace-nowrap">
            {actionLabel}
          </button>
        </div>
      </article>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-2 backdrop-blur-sm sm:p-4">
          <div className="mt-14 w-full max-w-5xl sm:mt-8">
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
              >
                Close
              </button>
            </div>
            {children}
          </div>
        </div>
      ) : null}
    </>
  );
}
