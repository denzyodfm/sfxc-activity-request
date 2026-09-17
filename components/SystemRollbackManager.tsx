'use client';

import { useEffect, useState } from 'react';

interface Revision {
  id: string;
  label: string;
  codeCommit: string | null;
  createdByName: string | null;
  createdAt: string;
  restoredAt: string | null;
}

interface Release {
  commit: string;
  shortCommit: string;
  date: string;
  subject: string;
}

export default function SystemRollbackManager() {
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [status, setStatus] = useState<'loading' | 'idle' | 'working' | 'error' | 'success'>('loading');
  const [message, setMessage] = useState('');

  const load = async () => {
    setStatus('loading');
    const response = await fetch('/api/admin/revisions', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) {
      setStatus('error');
      setMessage(data.error || 'Unable to load rollback history.');
      return;
    }
    setRevisions(data.revisions);
    setReleases(data.releases);
    setStatus('idle');
  };

  useEffect(() => { void load(); }, []);

  const run = async (body: object, confirmation?: string) => {
    if (confirmation && !window.confirm(confirmation)) return;
    setStatus('working');
    setMessage('');
    const response = await fetch('/api/admin/revisions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    const data = await response.json();
    setStatus(response.ok ? 'success' : 'error');
    setMessage(response.ok ? data.message : data.error || 'Rollback failed.');
    if (response.ok && !('commit' in body)) setTimeout(() => void load(), 800);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Settings rollback covers users, departments, fund-account definitions, voucher signatories, branding, and demo settings. Workflow decisions and accounting ledger entries remain protected audit records.
      </div>

      {message ? <div className={`rounded-2xl border px-4 py-3 text-sm ${status === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{message}</div> : null}

      <section className="sfxc-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-lg font-semibold text-slate-900">Settings History</h2><p className="mt-1 text-sm text-slate-500">Automatic restore points are saved after admin configuration changes.</p></div>
          <button type="button" disabled={status === 'working'} onClick={() => void run({ action: 'snapshot' })} className="sfxc-button">Create Backup Now</button>
        </div>
        <div className="mt-5 space-y-3">
          {status === 'loading' ? <p className="text-sm text-slate-500">Loading history...</p> : revisions.map((revision) => (
            <div key={revision.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="font-semibold text-slate-900">{revision.label}</p><p className="mt-1 text-xs text-slate-500">{new Date(revision.createdAt).toLocaleString()} · {revision.createdByName || 'System'}{revision.restoredAt ? ' · Previously restored' : ''}</p></div>
              <button type="button" disabled={status === 'working'} onClick={() => void run({ action: 'restore-settings', revisionId: revision.id }, `Restore settings to “${revision.label}”? A safety backup of the current settings will be created first.`)} className="sfxc-button-secondary">Restore</button>
            </div>
          ))}
        </div>
      </section>

      <section className="sfxc-card p-6">
        <h2 className="text-lg font-semibold text-slate-900">Code Releases</h2>
        <p className="mt-1 text-sm text-slate-500">Roll back the deployed application to an earlier verified Git commit. The app restarts after a successful build.</p>
        <div className="mt-5 space-y-3">
          {releases.map((release, index) => (
            <div key={release.commit} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="font-semibold text-slate-900">{release.subject}</p><p className="mt-1 font-mono text-xs text-slate-500">{release.shortCommit} · {new Date(release.date).toLocaleString()}</p></div>
              {index === 0 ? <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Current</span> : <button type="button" disabled={status === 'working'} onClick={() => void run({ action: 'rollback-code', commit: release.commit }, `Roll back the live application to ${release.shortCommit}? The service will restart and may be unavailable briefly.`)} className="rounded-2xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50">Roll Back</button>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
