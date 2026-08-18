'use client';

import { useState } from 'react';
import FooterBranding from '@/components/FooterBranding';
import { BRANDING_MAX_LENGTH, Branding, DEFAULT_BRANDING } from '@/lib/branding';

const fields: { field: keyof Branding; label: string; hint: string }[] = [
  { field: 'poweredByLabel', label: 'Badge Text', hint: 'Shown inside the blue pill.' },
  { field: 'companyName', label: 'Company Name', hint: 'The large first letter is taken from this name.' },
  { field: 'teamLabel', label: 'Team Credit', hint: 'Shown after the company name.' }
];

export default function BrandingManager({ initialBranding }: { initialBranding: Branding }) {
  const [branding, setBranding] = useState(initialBranding);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const update = (field: keyof Branding, value: string) => {
    setBranding((current) => ({ ...current, [field]: value }));
    setMessage('');
  };

  // Fills the form with the defaults; still needs Save to take effect.
  const resetToDefaults = () => {
    setBranding(DEFAULT_BRANDING);
    setMessage('');
  };

  const save = async () => {
    setSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/admin/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branding })
      });
      const data = await response.json();

      if (response.ok) {
        setBranding(data.branding);
        setMessage(`${data.message} Reload any open page to see it there.`);
      } else {
        setMessage(data.error || 'Unable to update the footer branding.');
      }
    } catch {
      setMessage('Unable to reach the server. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="sfxc-card p-6">
      <h2 className="text-xl font-semibold text-slate-900">Footer Branding</h2>
      <p className="mt-2 text-sm text-slate-500">
        Controls the &ldquo;Powered by&rdquo; credit at the bottom of every page. Leave a field empty to hide that part.
        The footer does not appear on printed vouchers.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {fields.map(({ field, label, hint }) => (
          <label key={field} className="block">
            <span className="text-sm font-semibold text-slate-700">{label}</span>
            <input
              value={branding[field]}
              onChange={(event) => update(field, event.target.value)}
              maxLength={BRANDING_MAX_LENGTH}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
            <span className="mt-1 block text-xs text-slate-500">{hint}</span>
          </label>
        ))}
      </div>

      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Preview</p>
        <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-5">
          <FooterBranding branding={branding} />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button type="button" onClick={save} disabled={saving} className="sfxc-button">
          {saving ? 'Saving...' : 'Save Footer Branding'}
        </button>
        <button
          type="button"
          onClick={resetToDefaults}
          disabled={saving}
          className="text-sm font-semibold text-slate-600 underline hover:text-sfxc-green"
        >
          Reset to defaults
        </button>
        {message ? <p className="text-sm text-slate-600">{message}</p> : null}
      </div>
    </section>
  );
}
