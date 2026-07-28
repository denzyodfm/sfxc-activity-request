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
    icon: 'requests',
    title: 'Requests in the system',
    description: 'Open the complete request list',
    statuses: [] as string[]
  },
  {
    key: 'FOR_FUND_AVAILABILITY',
    icon: 'fund',
    title: 'Pending Fund',
    description: 'Awaiting fund availability review',
    statuses: ['FOR_FUND_AVAILABILITY']
  },
  {
    key: 'FOR_REVIEW',
    icon: 'review',
    title: 'Pending Review',
    description: 'Ready for reviewer action',
    statuses: ['FOR_REVIEW']
  },
  {
    key: 'FOR_ENDORSEMENT',
    icon: 'endorsement',
    title: 'Pending Endorsement',
    description: 'Waiting for endorsement',
    statuses: ['FOR_ENDORSEMENT']
  },
  {
    key: 'FOR_APPROVAL',
    icon: 'approval',
    title: 'Pending Approval',
    description: 'Awaiting final approver',
    statuses: ['FOR_APPROVAL']
  },
  {
    key: 'APPROVED',
    icon: 'voucher',
    title: 'For Voucher',
    description: 'Ready for voucher printing',
    statuses: ['APPROVED']
  },
  {
    key: 'COMPLETED',
    icon: 'completed',
    title: 'Completed',
    description: 'Voucher request completed',
    statuses: ['COMPLETED', 'DONE']
  }
];

function CategoryIcon({ icon }: { icon: string }) {
  const commonProps = {
    className: 'h-6 w-6',
    fill: 'none',
    viewBox: '0 0 24 24',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true
  };

  if (icon === 'fund') {
    return (
      <svg {...commonProps}>
        <path d="M3 7.5h15.5A2.5 2.5 0 0 1 21 10v7.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-12A1.5 1.5 0 0 1 4.5 4H17" />
        <path d="M16 13h5M17.5 13h.01" />
      </svg>
    );
  }

  if (icon === 'review') {
    return (
      <svg {...commonProps}>
        <path d="M9 5h6M9 3h6v4H9zM7 5H5.5A1.5 1.5 0 0 0 4 6.5v13A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5v-13A1.5 1.5 0 0 0 18.5 5H17" />
        <path d="m8 14 2.2 2.2L16.5 10" />
      </svg>
    );
  }

  if (icon === 'endorsement') {
    return (
      <svg {...commonProps}>
        <path d="M4 20h16M7 16h10l-1-4a4.1 4.1 0 0 0-8 0l-1 4Z" />
        <path d="M9 8V5a3 3 0 0 1 6 0v3M6 16v2h12v-2" />
      </svg>
    );
  }

  if (icon === 'approval') {
    return (
      <svg {...commonProps}>
        <path d="M12 3 5 6v5c0 4.6 2.9 8 7 10 4.1-2 7-5.4 7-10V6l-7-3Z" />
        <path d="m8.5 12 2.2 2.2 4.8-5" />
      </svg>
    );
  }

  if (icon === 'voucher') {
    return (
      <svg {...commonProps}>
        <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
        <path d="M9 8h6M9 12h6M9 16h3" />
      </svg>
    );
  }

  if (icon === 'completed') {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 2.7 2.7L16.5 9" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
      <path d="M7 9h10M7 13h10M7 17h6" />
    </svg>
  );
}

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
              className="group relative flex h-full flex-col sfxc-card p-6 text-left transition hover:-translate-y-0.5 hover:border-sfxc-green hover:shadow-md focus:outline-none focus:ring-2 focus:ring-sfxc-green/40"
              aria-label={`View ${category.title} requests`}
            >
              <div className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-sfxc-green transition group-hover:border-sfxc-green group-hover:bg-sfxc-green group-hover:text-white">
                <CategoryIcon icon={category.icon} />
              </div>
              <p className={`${category.key === 'ALL' ? 'normal-case tracking-normal' : 'uppercase tracking-[0.24em]'} min-h-[4.5rem] pr-11 text-sm text-slate-500`}>
                {category.title}
              </p>
              <p className="min-h-[4.5rem] text-sm text-slate-500">{category.description}</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{count}</p>
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
