'use client';

import { useMemo, useState } from 'react';
import RequestDetails, { RequestDetailsData } from './RequestDetails';
import StatusBadge from './StatusBadge';
import { formatMoney } from '@/lib/money';

export interface DashboardRequestData extends RequestDetailsData {
  id: string;
  createdAt: string;
}

const categories = [
  {
    key: 'ALL',
    title: 'Requests in the system',
    description: 'Open the complete request list',
    statuses: [] as string[]
  },
  {
    key: 'FOR_FUND_AVAILABILITY',
    title: 'Pending Fund',
    description: 'Awaiting fund availability review',
    statuses: ['FOR_FUND_AVAILABILITY']
  },
  {
    key: 'FOR_REVIEW',
    title: 'Pending Review',
    description: 'Ready for reviewer action',
    statuses: ['FOR_REVIEW']
  },
  {
    key: 'FOR_ENDORSEMENT',
    title: 'Pending Endorsement',
    description: 'Waiting for endorsement',
    statuses: ['FOR_ENDORSEMENT']
  },
  {
    key: 'FOR_APPROVAL',
    title: 'Pending Approval',
    description: 'Awaiting final approver',
    statuses: ['FOR_APPROVAL']
  },
  {
    key: 'APPROVED',
    title: 'For Voucher',
    description: 'Ready for voucher printing',
    statuses: ['APPROVED']
  },
  {
    key: 'COMPLETED',
    title: 'Completed',
    description: 'Voucher request completed',
    statuses: ['COMPLETED', 'DONE']
  }
];

export default function DashboardRequestBrowser({ requests }: { requests: DashboardRequestData[] }) {
  const [selectedCategory, setSelectedCategory] = useState<(typeof categories)[number] | null>(null);
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);

  const selectedRequests = useMemo(() => {
    if (!selectedCategory || selectedCategory.statuses.length === 0) {
      return requests;
    }

    return requests.filter((request) => selectedCategory.statuses.includes(request.status));
  }, [requests, selectedCategory]);

  const openCategory = (category: (typeof categories)[number]) => {
    setSelectedCategory(category);
    setExpandedRequestId(null);
  };

  const closeList = () => {
    setSelectedCategory(null);
    setExpandedRequestId(null);
  };

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
        {categories.map((category) => {
          const count =
            category.statuses.length === 0
              ? requests.length
              : requests.filter((request) => category.statuses.includes(request.status)).length;

          return (
            <button
              key={category.key}
              type="button"
              onClick={() => openCategory(category)}
              className="sfxc-card p-6 text-left transition hover:-translate-y-0.5 hover:border-sfxc-green hover:shadow-md focus:outline-none focus:ring-2 focus:ring-sfxc-green/40"
              aria-label={`View ${category.title} requests`}
            >
              <p className={`${category.key === 'ALL' ? 'normal-case tracking-normal' : 'uppercase tracking-[0.24em]'} text-sm text-slate-500`}>
                {category.title}
              </p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{count}</p>
              <p className="mt-2 text-sm text-slate-500">{category.description}</p>
            </button>
          );
        })}
      </div>

      {selectedCategory ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="mx-auto mt-6 w-full max-w-6xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-sfxc-green">Request List</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">{selectedCategory.title}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedRequests.length} request{selectedRequests.length === 1 ? '' : 's'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeList}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="mt-6 space-y-3">
              {selectedRequests.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                  No requests are in this category.
                </div>
              ) : (
                selectedRequests.map((request) => {
                  const expanded = expandedRequestId === request.id;

                  return (
                    <article key={request.id} className="overflow-hidden rounded-2xl border border-slate-200">
                      <div className="grid gap-4 p-4 text-sm md:grid-cols-[140px_1fr_1fr_130px_auto_auto] md:items-center">
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Request No.</p>
                          <p className="mt-1 font-semibold text-slate-900">{request.controlNumber}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Department</p>
                          <p className="mt-1 font-semibold text-slate-900">{request.departmentName}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Requested By</p>
                          <p className="mt-1 font-semibold text-slate-900">{request.requestedByName}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Amount</p>
                          <p className="mt-1 font-semibold text-slate-900">{formatMoney(request.amount)}</p>
                        </div>
                        <StatusBadge status={request.status} />
                        <button
                          type="button"
                          onClick={() => setExpandedRequestId(expanded ? null : request.id)}
                          className="rounded-xl border border-sfxc-green px-4 py-2 text-sm font-semibold text-sfxc-green hover:bg-emerald-50"
                        >
                          {expanded ? 'Hide Details' : 'View Details'}
                        </button>
                      </div>

                      {expanded ? (
                        <div className="border-t border-slate-200 bg-slate-50 p-4">
                          <RequestDetails request={request} />
                        </div>
                      ) : null}
                    </article>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
