import { Branding } from '@/lib/branding';

/**
 * The "Powered by" lockup shown in the footer.
 *
 * Shared by the real footer and the Admin Settings preview so the two cannot
 * drift. Any field left empty is omitted, and the monogram is derived from the
 * first letter of the company name so it always matches the wordmark.
 */
export default function FooterBranding({ branding }: { branding: Branding }) {
  const poweredByLabel = branding.poweredByLabel.trim();
  const companyName = branding.companyName.trim();
  const teamLabel = branding.teamLabel.trim();

  if (!poweredByLabel && !companyName && !teamLabel) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
      {poweredByLabel ? (
        <span className="inline-flex items-center rounded-full border border-white bg-[#1c3f94] px-3 py-1 text-[11px] font-bold italic leading-none text-white shadow-sm ring-1 ring-[#1c3f94]/40">
          {poweredByLabel}
        </span>
      ) : null}
      {companyName ? (
        <span className="inline-flex items-baseline gap-1.5 text-[#c00000]">
          <span className="font-serif text-2xl font-bold leading-none">{companyName.charAt(0).toUpperCase()}</span>
          <span className="font-serif text-[11px] font-bold uppercase tracking-[0.08em]">{companyName}</span>
        </span>
      ) : null}
      {teamLabel ? (
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600">{teamLabel}</span>
      ) : null}
    </div>
  );
}
