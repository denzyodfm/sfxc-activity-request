'use client';

import { ReactNode, useState } from 'react';
import { RequestDetailsData } from './RequestDetails';
import RequestDetails from './RequestDetails';
import { formatMoney } from '@/lib/money';

interface RequestQueueItemProps {
  request: RequestDetailsData;
  actionLabel?: string;
  children?: ReactNode;
  tabs?: { label: string; content: ReactNode }[];
  defaultTab?: number;
  dateLabel?: string;
  dateValue?: string;
}

export default function RequestQueueItem({ request, actionLabel = 'View Request', children, tabs, defaultTab = 0, dateLabel = 'Request Date', dateValue }: RequestQueueItemProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const allTabs = tabs ? [{ label: 'Request Details', content: <RequestDetails request={request} /> }, ...tabs] : null;

  return (
    <>
      <article className="sfxc-card overflow-hidden">
        <div className="grid gap-4 p-5 text-sm md:grid-cols-[130px_140px_1fr_1fr_140px_auto] md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{dateLabel}</p>
            <p className="mt-1 font-semibold text-slate-900">{dateValue ?? new Date(request.date).toLocaleDateString()}</p>
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
          <button type="button" onClick={() => { setActiveTab(defaultTab); setOpen(true); }} className="sfxc-button whitespace-nowrap">
            {actionLabel}
          </button>
        </div>
      </article>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-2 backdrop-blur-sm sm:p-4">
          <div className="mt-14 w-full max-w-5xl sm:mt-8">
            {/* Sticky so Close stays reachable down a long voucher. The
                voucher's Print / Excel buttons live in its card header rather
                than pinned to the viewport, where they used to land on top of
                this button. */}
            <div className="sticky top-0 z-10 mb-3 flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
              >
                Close
              </button>
            </div>
            {allTabs ? (
              <div className="rounded-2xl bg-white p-3 shadow-xl sm:p-4">
                <div role="tablist" aria-label={`${request.controlNumber} information`} className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-3">
                  {allTabs.map((tab, index) => <button key={tab.label} type="button" role="tab" aria-selected={activeTab === index} onClick={() => setActiveTab(index)} className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-sfxc-green ${activeTab === index ? 'bg-sfxc-green text-white' : 'bg-slate-100 text-slate-700 hover:bg-emerald-50'}`}>{tab.label}</button>)}
                </div>
                <div role="tabpanel" className="max-h-[calc(100vh-12rem)] overflow-y-auto pt-4">{allTabs[activeTab]?.content}</div>
              </div>
            ) : children}
          </div>
        </div>
      ) : null}
    </>
  );
}
