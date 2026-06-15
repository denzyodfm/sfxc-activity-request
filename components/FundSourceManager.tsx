'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatMoney } from '@/lib/money';

interface LedgerEntry {
  id: string;
  type: string;
  description: string;
  debit: number;
  credit: number;
  balanceAfter: number;
  createdAt: string;
  transactionDate: string;
  reference?: string | null;
  actorName?: string;
  controlNumber?: string;
}

interface FundSourceSummary {
  id: string;
  name: string;
  description?: string | null;
  balance: number;
  totalDebit: number;
  totalCredit: number;
  ledgerEntries: LedgerEntry[];
}

interface FundSourceManagerProps {
  fundSources: FundSourceSummary[];
}

export default function FundSourceManager({ fundSources }: FundSourceManagerProps) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [sourceName, setSourceName] = useState('');
  const [sourceDescription, setSourceDescription] = useState('');
  const [depositAmounts, setDepositAmounts] = useState<Record<string, string>>({});
  const [depositDates, setDepositDates] = useState<Record<string, string>>({});
  const [depositReferences, setDepositReferences] = useState<Record<string, string>>({});
  const [depositDescriptions, setDepositDescriptions] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'saving' | 'error' | 'success'>('idle');
  const [message, setMessage] = useState('');

  const report = useMemo(() => {
    return fundSources.reduce(
      (summary, source) => ({
        balance: summary.balance + source.balance,
        debit: summary.debit + source.totalDebit,
        credit: summary.credit + source.totalCredit
      }),
      { balance: 0, debit: 0, credit: 0 }
    );
  }, [fundSources]);

  const createSource = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('saving');
    setMessage('');

    const response = await fetch('/api/fund-sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: sourceName, description: sourceDescription })
    });
    const data = await response.json();

    if (!response.ok) {
      setStatus('error');
      setMessage(data.error || 'Unable to create source of fund.');
      return;
    }

    setSourceName('');
    setSourceDescription('');
    setStatus('success');
    setMessage(data.message || 'Source of fund created.');
    router.refresh();
  };

  const postDeposit = async (event: React.FormEvent<HTMLFormElement>, fundSourceId: string) => {
    event.preventDefault();
    setStatus('saving');
    setMessage('');

    const response = await fetch('/api/fund-sources/deposits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fundSourceId,
          amount: depositAmounts[fundSourceId],
          depositDate: depositDates[fundSourceId] ?? today,
          reference: depositReferences[fundSourceId],
          description: depositDescriptions[fundSourceId]
        })
    });
    const data = await response.json();

    if (!response.ok) {
      setStatus('error');
      setMessage(data.error || 'Unable to post deposit.');
      return;
    }

    setDepositAmounts((current) => ({ ...current, [fundSourceId]: '' }));
    setDepositDates((current) => ({ ...current, [fundSourceId]: today }));
    setDepositReferences((current) => ({ ...current, [fundSourceId]: '' }));
    setDepositDescriptions((current) => ({ ...current, [fundSourceId]: '' }));
    setStatus('success');
    setMessage(data.message || 'Deposit posted.');
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="sfxc-card p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Deposits</p>
          <p className="mt-3 text-2xl font-semibold text-slate-900">{formatMoney(report.debit)}</p>
        </div>
        <div className="sfxc-card p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Completed Requests</p>
          <p className="mt-3 text-2xl font-semibold text-slate-900">{formatMoney(report.credit)}</p>
        </div>
        <div className="sfxc-card p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Available Balance</p>
          <p className="mt-3 text-2xl font-semibold text-sfxc-green">{formatMoney(report.balance)}</p>
        </div>
      </div>

      <form className="sfxc-card grid gap-4 p-6 md:grid-cols-[1fr_1fr_auto]" onSubmit={createSource}>
        <label className="space-y-2 text-sm text-slate-700">
          Source of Fund Name
          <input
            value={sourceName}
            onChange={(event) => setSourceName(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sfxc-green"
            placeholder="Example: Alumni Fund"
          />
        </label>
        <label className="space-y-2 text-sm text-slate-700">
          Description
          <input
            value={sourceDescription}
            onChange={(event) => setSourceDescription(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sfxc-green"
            placeholder="Optional notes"
          />
        </label>
        <button type="submit" disabled={status === 'saving'} className="sfxc-button self-end">
          Add Source
        </button>
      </form>

      {status !== 'idle' ? (
        <div className={`rounded-3xl border px-4 py-3 text-sm ${status === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
          {message}
        </div>
      ) : null}

      <div className="grid gap-6">
        {fundSources.map((source) => (
          <section key={source.id} className="sfxc-card overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-slate-200 p-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Source of Fund</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">{source.name}</h2>
                {source.description ? <p className="mt-2 text-sm text-slate-600">{source.description}</p> : null}
              </div>
              <div className="grid gap-3 text-sm sm:grid-cols-3 lg:min-w-[520px]">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Deposits</p>
                  <p className="mt-2 font-semibold text-slate-900">{formatMoney(source.totalDebit)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Completed</p>
                  <p className="mt-2 font-semibold text-slate-900">{formatMoney(source.totalCredit)}</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-emerald-700">Balance</p>
                  <p className="mt-2 font-semibold text-emerald-900">{formatMoney(source.balance)}</p>
                </div>
              </div>
            </div>

            <form className="grid gap-4 border-b border-slate-200 p-6 md:grid-cols-2 xl:grid-cols-[160px_170px_1fr_1fr_auto]" onSubmit={(event) => postDeposit(event, source.id)}>
              <label className="space-y-2 text-sm text-slate-700">
                Deposit Amount
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={depositAmounts[source.id] ?? ''}
                  onChange={(event) => setDepositAmounts((current) => ({ ...current, [source.id]: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sfxc-green"
                  placeholder="0.00"
                />
              </label>
              <label className="space-y-2 text-sm text-slate-700">
                Deposit Date
                <input
                  type="date"
                  value={depositDates[source.id] ?? today}
                  onChange={(event) => setDepositDates((current) => ({ ...current, [source.id]: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sfxc-green"
                />
              </label>
              <label className="space-y-2 text-sm text-slate-700">
                Reference
                <input
                  value={depositReferences[source.id] ?? ''}
                  onChange={(event) => setDepositReferences((current) => ({ ...current, [source.id]: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sfxc-green"
                  placeholder="OR / check / bank ref."
                />
              </label>
              <label className="space-y-2 text-sm text-slate-700">
                Deposit Description
                <input
                  value={depositDescriptions[source.id] ?? ''}
                  onChange={(event) => setDepositDescriptions((current) => ({ ...current, [source.id]: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sfxc-green"
                  placeholder="Example: Monthly deposit"
                />
              </label>
              <button type="submit" disabled={status === 'saving'} className="sfxc-button self-end">
                Post Deposit
              </button>
            </form>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">Reference</th>
                    <th className="px-6 py-3 font-medium">Description</th>
                    <th className="px-6 py-3 font-medium">Debit</th>
                    <th className="px-6 py-3 font-medium">Credit</th>
                    <th className="px-6 py-3 font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {source.ledgerEntries.length === 0 ? (
                    <tr>
                      <td className="px-6 py-5 text-slate-500" colSpan={6}>No ledger entries yet.</td>
                    </tr>
                  ) : (
                    source.ledgerEntries.map((entry) => (
                      <tr key={entry.id}>
                        <td className="px-6 py-4 text-slate-600">{new Date(entry.transactionDate).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-slate-600">{entry.reference || '-'}</td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{entry.description}</div>
                          <div className="text-xs text-slate-500">{entry.controlNumber || entry.actorName || entry.type}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-700">{entry.debit ? formatMoney(entry.debit) : '-'}</td>
                        <td className="px-6 py-4 text-slate-700">{entry.credit ? formatMoney(entry.credit) : '-'}</td>
                        <td className="px-6 py-4 font-semibold text-slate-900">{formatMoney(entry.balanceAfter)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
