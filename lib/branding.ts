import prisma from '@/lib/prisma';

/**
 * The footer branding lockup, editable from Admin Settings → Branding.
 *
 * Each field is stored as one AppSetting row. An absent row falls back to the
 * default below, so a fresh database renders correctly without seeding. A row
 * holding an empty string is a deliberate "hide this part" and is respected —
 * that is the difference between never set and set to nothing.
 */
export interface Branding {
  /** Text in the blue pill, e.g. "Powered by". */
  poweredByLabel: string;
  /** Company wordmark, e.g. "Valdemeir Resources, Inc". */
  companyName: string;
  /** Credit line after the wordmark, e.g. "IT Team – Kamaru". */
  teamLabel: string;
}

export const BRANDING_KEYS: Record<keyof Branding, string> = {
  poweredByLabel: 'footer.poweredByLabel',
  companyName: 'footer.companyName',
  teamLabel: 'footer.teamLabel'
};

export const DEFAULT_BRANDING: Branding = {
  poweredByLabel: 'Powered by',
  companyName: 'Valdemeir Resources, Inc',
  teamLabel: 'IT Team – Kamaru'
};

/** Longest value we will store, so a paste cannot break the footer layout. */
export const BRANDING_MAX_LENGTH = 80;

const keyToField = new Map(
  (Object.keys(BRANDING_KEYS) as (keyof Branding)[]).map((field) => [BRANDING_KEYS[field], field])
);

/**
 * Reads the branding settings, falling back to DEFAULT_BRANDING.
 *
 * Branding is cosmetic, so a database problem here must not take down every
 * page that renders the footer — the root layout calls this. On failure we log
 * and return the defaults rather than throwing.
 */
export async function getBranding(): Promise<Branding> {
  try {
    const rows = await prisma.appSetting.findMany({
      where: { key: { in: Object.values(BRANDING_KEYS) } },
      select: { key: true, value: true }
    });

    const branding = { ...DEFAULT_BRANDING };

    for (const row of rows) {
      const field = keyToField.get(row.key);
      if (field) {
        branding[field] = row.value;
      }
    }

    return branding;
  } catch (error) {
    console.error('Failed to load branding settings; using defaults.', error);
    return { ...DEFAULT_BRANDING };
  }
}
