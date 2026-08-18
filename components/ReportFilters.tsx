'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Option {
  id: string;
  name: string;
}

interface ReportFiltersProps {
  departments: Option[];
  fundSources: Option[];
  canExportLedger: boolean;
  /** Current filters as a query string, reused for the export links. */
  exportQuery: string;
  initial: {
    from: string;
    to: string;
    status: string;
    departmentId: string;
    fundSourceId: string;
  };
  /** A requestor is confined to their own department, so the picker is hidden. */
  lockDepartment: boolean;
}

const statuses = [
  'ALL',
  'FOR_FUND_AVAILABILITY',
  'FOR_REVIEW',
  'FOR_ENDORSEMENT',
  'FOR_APPROVAL',
  'APPROVED',
  'COMPLETED',
  'DENIED'
];

const inputClass =
  'mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sfxc-green focus:bg-white';

export default function ReportFilters({
  departments,
  fundSources,
  canExportLedger,
  exportQuery,
  initial,
  lockDepartment
}: ReportFiltersProps) {
  const router = useRouter();
  const [filters, setFilters] = useState(initial);

  const update = (key: keyof typeof filters, value: string) =>
    setFilters((current) => ({ ...current, [key]: value }));

  const apply = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const params = new URLSearchParams();

    // Defaults are left out so the URL stays readable and shareable.
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.status !== 'ALL') params.set('status', filters.status);
    if (!lockDepartment && filters.departmentId !== 'ALL') params.set('departmentId', filters.departmentId);
    if (filters.fundSourceId !== 'ALL') params.set('fundSourceId', filters.fundSourceId);

    const query = params.toString();
    router.push(query ? `/reports?${query}` : '/reports');
  };

  const reset = () => {
    setFilters({ from: '', to: '', status: 'ALL', departmentId: 'ALL', fundSourceId: 'ALL' });
    router.push('/reports');
  };

  const suffix = exportQuery ? `?${exportQuery}` : '';

  return (
    <form className="sfxc-card space-y-4 p-6" onSubmit={apply}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <label className="block text-sm text-slate-700">
          From
          <input
            type="date"
            value={filters.from}
            onChange={(event) => update('from', event.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block text-sm text-slate-700">
          To
          <input
            type="date"
            value={filters.to}
            onChange={(event) => update('to', event.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block text-sm text-slate-700">
          Status
          <select
            value={filters.status}
            onChange={(event) => update('status', event.target.value)}
            className={inputClass}
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status === 'ALL' ? 'All statuses' : status.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </label>
        {lockDepartment ? null : (
          <label className="block text-sm text-slate-700">
            Department
            <select
              value={filters.departmentId}
              onChange={(event) => update('departmentId', event.target.value)}
              className={inputClass}
            >
              <option value="ALL">All departments</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="block text-sm text-slate-700">
          Source of Fund
          <select
            value={filters.fundSourceId}
            onChange={(event) => update('fundSourceId', event.target.value)}
            className={inputClass}
          >
            <option value="ALL">All funds</option>
            {fundSources.map((fundSource) => (
              <option key={fundSource.id} value={fundSource.id}>
                {fundSource.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="submit" className="sfxc-button">
          Apply Filters
        </button>
        <button type="button" onClick={reset} className="sfxc-button-secondary">
          Reset
        </button>
        <a
          href={`/api/reports/requests${suffix}`}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-sfxc-green hover:text-sfxc-green"
        >
          Export Requests (CSV)
        </a>
        {canExportLedger ? (
          <a
            href={`/api/reports/ledger${suffix}`}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-sfxc-green hover:text-sfxc-green"
          >
            Export Fund Ledger (CSV)
          </a>
        ) : null}
      </div>
    </form>
  );
}
