'use client';

import { useState } from 'react';

export interface VoucherSignatoryData {
  slot: string;
  name: string;
  title: string;
}

const labels: Record<string, string> = {
  PREPARED_BY: 'Prepared By (Fund Officer fallback)',
  CHECKED_BY: 'Checked By (Reviewer fallback)',
  VERIFIED_BY: 'Verified By (Endorser fallback)',
  RECOMMENDING_APPROVAL: 'Recommending Approval (JCA)',
  APPROVED_BY: 'Approved By (JMAPC)',
  PRESIDENT: 'President'
};

export default function VoucherSignatoryManager({ initialSignatories }: { initialSignatories: VoucherSignatoryData[] }) {
  const [signatories, setSignatories] = useState(initialSignatories);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const update = (slot: string, field: 'name' | 'title', value: string) => {
    setSignatories((current) => current.map((item) => item.slot === slot ? { ...item, [field]: value } : item));
  };

  const save = async () => {
    setSaving(true);
    setMessage('');
    const response = await fetch('/api/admin/voucher-signatories', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signatories })
    });
    const data = await response.json();
    setSaving(false);
    setMessage(response.ok ? data.message : data.error || 'Unable to update voucher signatories.');
  };

  return (
    <section className="sfxc-card p-6">
      <h2 className="text-xl font-semibold text-slate-900">Voucher Approvers and Signatories</h2>
      <p className="mt-2 text-sm text-slate-500">Workflow names are used for Prepared, Checked, and Verified when available. These values provide editable fallbacks and fixed approval names.</p>
      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.15em] text-slate-500">
            <tr><th className="px-4 py-3">Voucher Position</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Title</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {signatories.map((item) => (
              <tr key={item.slot}>
                <td className="px-4 py-3 font-semibold text-slate-800">{labels[item.slot]}</td>
                <td className="px-4 py-3"><input value={item.name} onChange={(event) => update(item.slot, 'name', event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2" /></td>
                <td className="px-4 py-3"><input value={item.title} onChange={(event) => update(item.slot, 'title', event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-5 flex items-center gap-4">
        <button type="button" onClick={save} disabled={saving} className="sfxc-button">{saving ? 'Saving...' : 'Save Voucher Signatories'}</button>
        {message ? <p className="text-sm text-slate-600">{message}</p> : null}
      </div>
    </section>
  );
}
