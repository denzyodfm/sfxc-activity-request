'use client';

import { useState } from 'react';
import {
  DemoAccountSettings,
  formatDemoAccounts,
  parseDemoAccounts
} from '@/lib/demo-accounts';

interface SampleDataCounts {
  requests: number;
  attachments: number;
  approvals: number;
  ledgerEntries: number;
  requestAuditLogs: number;
}

export default function DemoDataManager({
  initialSettings,
  initialCounts
}: {
  initialSettings: DemoAccountSettings;
  initialCounts: SampleDataCounts;
}) {
  const [enabled, setEnabled] = useState(initialSettings.enabled);
  const [accountText, setAccountText] = useState(formatDemoAccounts(initialSettings.accounts));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [counts, setCounts] = useState(initialCounts);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState('');

  const parsedAccounts = parseDemoAccounts(accountText);

  const save = async () => {
    setSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/admin/demo-accounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, accounts: parsedAccounts })
      });
      const data = await response.json();

      if (response.ok) {
        setAccountText(formatDemoAccounts(data.settings.accounts));
        setMessage(data.message);
      } else {
        setMessage(data.error || 'Unable to save the demo account settings.');
      }
    } catch {
      setMessage('Unable to reach the server. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const deleteSampleData = async () => {
    setDeleting(true);
    setDeleteMessage('');

    try {
      const response = await fetch('/api/admin/sample-data', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'DELETE ALL' })
      });
      const data = await response.json();

      if (response.ok) {
        setCounts({ requests: 0, attachments: 0, approvals: 0, ledgerEntries: 0, requestAuditLogs: 0 });
        setDeleteMessage(data.message);
        setConfirming(false);
      } else {
        setDeleteMessage(data.error || 'Unable to delete the sample data.');
      }
    } catch {
      setDeleteMessage('Unable to reach the server. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const nothingToDelete = counts.requests === 0 && counts.ledgerEntries === 0;

  return (
    <div className="space-y-6">
      <section className="sfxc-card p-6">
        <h2 className="text-xl font-semibold text-slate-900">Demo Accounts on the Sign-In Page</h2>
        <p className="mt-2 text-sm text-slate-500">
          Lists working credentials on the sign-in page so testers can pick an account without being handed a password.
          While this is on, anyone who can reach the sign-in page can read every password below.
        </p>

        <label className="mt-5 flex items-start gap-3">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => {
              setEnabled(event.target.checked);
              setMessage('');
            }}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sfxc-green focus:ring-sfxc-green"
          />
          <span>
            <span className="text-sm font-semibold text-slate-800">Show demo accounts on the sign-in page</span>
            <span className="mt-0.5 block text-xs text-slate-500">
              When unticked the panel is hidden and the credentials are left out of the page entirely.
            </span>
          </span>
        </label>

        <label className="mt-5 block">
          <span className="text-sm font-semibold text-slate-700">Accounts</span>
          <span className="mt-0.5 block text-xs text-slate-500">
            One per line: email, password, then an optional role. The output of{' '}
            <code className="rounded bg-slate-100 px-1">scripts/set-initial-passwords.js</code> can be pasted in as-is;
            its header lines are ignored.
          </span>
          <textarea
            value={accountText}
            onChange={(event) => {
              setAccountText(event.target.value);
              setMessage('');
            }}
            rows={9}
            spellCheck={false}
            placeholder={'admin@sfxc.edu      forNbz3yBGYAi2   (ADMIN)\nnina.reyes@sfxc.edu 6Q9wEKRk53jUmX   (REQUESTOR)'}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs"
          />
        </label>

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button type="button" onClick={save} disabled={saving} className="sfxc-button">
            {saving ? 'Saving...' : 'Save Demo Account Settings'}
          </button>
          <p className="text-sm text-slate-600">
            {message || `${parsedAccounts.length} account(s) will be listed.`}
          </p>
        </div>
      </section>

      <section className="sfxc-card border-rose-200 p-6">
        <h2 className="text-xl font-semibold text-rose-900">Delete Sample Activity Requests</h2>
        <p className="mt-2 text-sm text-slate-600">
          Removes every activity request along with its attachments, approvals, and request history, then empties the
          fund ledger so all balances read zero. Users, departments, fund sources, voucher approvers, and branding are
          kept. This cannot be undone.
        </p>

        <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Activity requests', value: counts.requests },
            { label: 'Attachments', value: counts.attachments },
            { label: 'Approvals', value: counts.approvals },
            { label: 'Ledger entries', value: counts.ledgerEntries }
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <dt className="text-xs uppercase tracking-wide text-slate-500">{item.label}</dt>
              <dd className="mt-1 text-2xl font-semibold text-slate-900">{item.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 flex flex-wrap items-center gap-4">
          {confirming ? (
            <>
              <button
                type="button"
                onClick={deleteSampleData}
                disabled={deleting}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
              >
                {deleting
                  ? 'Deleting...'
                  : `Yes, delete ${counts.requests} request(s) and zero the ledger`}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={deleting}
                className="text-sm font-semibold text-slate-600 underline hover:text-sfxc-green"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setConfirming(true);
                setDeleteMessage('');
              }}
              disabled={nothingToDelete}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Delete All Sample Activity Requests
            </button>
          )}

          {deleteMessage ? <p className="text-sm text-slate-700">{deleteMessage}</p> : null}
          {!deleteMessage && nothingToDelete ? (
            <p className="text-sm text-slate-500">No activity requests or ledger entries to delete.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
