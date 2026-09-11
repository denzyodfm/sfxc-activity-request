'use client';

import { useState } from 'react';

export interface VoucherSignatoryData {
  slot: string;
  name: string;
  title: string;
}

/** The accounts offered in each Name picker. */
export interface SignatoryCandidate {
  id: string;
  name: string;
  role: string;
  position?: string | null;
  isActive: boolean;
}

const labels: Record<string, string> = {
  PREPARED_BY: 'Prepared By (Fund Officer fallback)',
  CHECKED_BY: 'Checked By (Reviewer fallback)',
  VERIFIED_BY: 'Verified By (Endorser fallback)',
  RECOMMENDING_APPROVAL: 'Recommending Approval (JCA)',
  APPROVED_BY: 'Approved By (JMAPC)',
  PRESIDENT: 'President'
};

/**
 * The role whose holders are listed first for each slot. The rest of the
 * accounts still follow, because a college does not always staff these
 * positions the way the workflow names them.
 */
const preferredRole: Record<string, string> = {
  PREPARED_BY: 'FUND_OFFICER',
  CHECKED_BY: 'REVIEWER',
  VERIFIED_BY: 'ENDORSER',
  RECOMMENDING_APPROVAL: 'APPROVER_JCA',
  APPROVED_BY: 'APPROVER_JMAPC'
};

/** Printed as the title when a picked account has no position recorded. */
const titleForRole: Record<string, string> = {
  FUND_OFFICER: 'Fund Officer',
  REVIEWER: 'Reviewer',
  ENDORSER: 'Endorser',
  APPROVER_JCA: 'JCA',
  APPROVER_JMAPC: 'JMAPC',
  ADMIN: 'Administrator',
  REQUESTOR: 'Requestor'
};

const CUSTOM = '__custom__';

export default function VoucherSignatoryManager({
  initialSignatories,
  candidates = []
}: {
  initialSignatories: VoucherSignatoryData[];
  candidates?: SignatoryCandidate[];
}) {
  const [signatories, setSignatories] = useState(initialSignatories);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  // Slots the admin has deliberately switched to a typed name. A slot whose
  // stored name matches no account starts here too, so an existing free-text
  // value is never silently replaced by a picker selection.
  const [customSlots, setCustomSlots] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const item of initialSignatories) {
      initial[item.slot] = !!item.name && !candidates.some((user) => user.name === item.name);
    }
    return initial;
  });

  const update = (slot: string, field: 'name' | 'title', value: string) => {
    setSignatories((current) =>
      current.map((item) => (item.slot === slot ? { ...item, [field]: value } : item))
    );
    setMessage('');
  };

  /** Orders the accounts for one slot: the matching role first, then the rest. */
  const optionsFor = (slot: string) => {
    const wanted = preferredRole[slot];
    const active = candidates.filter((user) => user.isActive);
    const primary = active.filter((user) => user.role === wanted);
    const others = active.filter((user) => user.role !== wanted);
    return { primary, others };
  };

  const chooseUser = (slot: string, value: string) => {
    if (value === CUSTOM) {
      setCustomSlots((current) => ({ ...current, [slot]: true }));
      setMessage('');
      return;
    }

    const user = candidates.find((candidate) => candidate.id === value);
    if (!user) return;

    setCustomSlots((current) => ({ ...current, [slot]: false }));
    setSignatories((current) =>
      current.map((item) =>
        item.slot === slot
          ? {
              ...item,
              name: user.name,
              // The person's recorded position wins; otherwise fall back to a
              // readable form of their role rather than leaving the box blank.
              title: user.position?.trim() || titleForRole[user.role] || item.title
            }
          : item
      )
    );
    setMessage('');
  };

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/voucher-signatories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatories })
      });
      const data = await response.json();
      setMessage(response.ok ? data.message : data.error || 'Unable to update voucher signatories.');
    } catch {
      setMessage('Unable to reach the server. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="sfxc-card p-6">
      <h2 className="text-xl font-semibold text-slate-900">Voucher Approvers and Signatories</h2>
      <p className="mt-2 max-w-3xl text-sm text-slate-500">
        Pick the person for each position, or type a name for anyone without an account. Prepared, Checked and Verified
        print the person who actually approved the request along with their approving code — the names here fill those
        boxes only when no approval was recorded.
      </p>

      {candidates.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
          No accounts to choose from yet. Create users under Manage Users and they will appear in these lists.
        </p>
      ) : null}

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.15em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Voucher Position</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Title</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {signatories.map((item) => {
              const { primary, others } = optionsFor(item.slot);
              const matched = candidates.find((user) => user.name === item.name);
              const isCustom = customSlots[item.slot] || (!matched && !!item.name);

              return (
                <tr key={item.slot}>
                  <td className="px-4 py-3 align-top font-semibold text-slate-800">{labels[item.slot]}</td>
                  <td className="px-4 py-3 align-top">
                    <select
                      value={isCustom ? CUSTOM : matched?.id ?? ''}
                      onChange={(event) => chooseUser(item.slot, event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
                      aria-label={`${labels[item.slot]} name`}
                    >
                      <option value="" disabled>
                        Select a person
                      </option>
                      {primary.length > 0 ? (
                        <optgroup label={titleForRole[preferredRole[item.slot]] ?? 'Suggested'}>
                          {primary.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name}
                            </option>
                          ))}
                        </optgroup>
                      ) : null}
                      {others.length > 0 ? (
                        <optgroup label="Other accounts">
                          {others.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name} — {titleForRole[user.role] ?? user.role.replace(/_/g, ' ')}
                            </option>
                          ))}
                        </optgroup>
                      ) : null}
                      <option value={CUSTOM}>Type a name…</option>
                    </select>

                    {isCustom ? (
                      <input
                        value={item.name}
                        onChange={(event) => update(item.slot, 'name', event.target.value)}
                        placeholder="Full name as it should print"
                        className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
                        aria-label={`${labels[item.slot]} typed name`}
                      />
                    ) : null}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <input
                      value={item.title}
                      onChange={(event) => update(item.slot, 'title', event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2"
                      aria-label={`${labels[item.slot]} title`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button type="button" onClick={save} disabled={saving} className="sfxc-button">
          {saving ? 'Saving...' : 'Save Voucher Signatories'}
        </button>
        {message ? <p className="text-sm text-slate-600">{message}</p> : null}
      </div>
    </section>
  );
}
