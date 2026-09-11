import prisma from '@/lib/prisma';

/**
 * The demo credentials panel on the sign-in page, controlled from
 * Admin Settings → Demo & Data.
 *
 * Both halves live in AppSetting rather than in source. The passwords are real
 * working credentials, and a committed default list would put them in git
 * history for good — which is the reason initial-passwords.txt is gitignored in
 * the first place. An absent `enabled` row means off, so a fresh database never
 * shows credentials to whoever reaches the login page.
 */

export interface DemoAccount {
  email: string;
  password: string;
  /** Free text, e.g. "ADMIN". Shown as a label; never used for authorisation. */
  role: string;
}

export const DEMO_KEYS = {
  enabled: 'demo.showAccounts',
  accounts: 'demo.accounts'
} as const;

export interface DemoAccountSettings {
  enabled: boolean;
  accounts: DemoAccount[];
}

/** What an unconfigured database gets: panel off, nothing listed. */
export const EMPTY_DEMO_SETTINGS: DemoAccountSettings = { enabled: false, accounts: [] };

/** Caps the list so a stray paste cannot bloat every login page render. */
export const DEMO_MAX_ACCOUNTS = 40;

/** Caps one field, so a paste cannot break the panel layout. */
export const DEMO_FIELD_MAX_LENGTH = 120;

/**
 * Parses the pasted credential list, one account per line:
 *
 *   admin@sfxc.edu   forNbz3yBGYAi2   (ADMIN)
 *
 * The columns match what scripts/set-initial-passwords.js prints, so that file
 * can be pasted in as-is. Lines whose first column is not an email address are
 * the header and footer prose of that file, and are skipped rather than
 * rejected — otherwise a straight paste would fail on its first line.
 */
export function parseDemoAccounts(raw: string): DemoAccount[] {
  const accounts: DemoAccount[] = [];

  for (const line of raw.split(/\r?\n/)) {
    const columns = line.trim().split(/\s+/);

    if (columns.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(columns[0])) continue;

    accounts.push({
      email: columns[0].toLowerCase().slice(0, DEMO_FIELD_MAX_LENGTH),
      password: columns[1].slice(0, DEMO_FIELD_MAX_LENGTH),
      role: (columns[2] ?? '').replace(/[()]/g, '').slice(0, DEMO_FIELD_MAX_LENGTH)
    });

    if (accounts.length >= DEMO_MAX_ACCOUNTS) break;
  }

  return accounts;
}

/** The inverse of parseDemoAccounts(), for filling the textarea. */
export function formatDemoAccounts(accounts: DemoAccount[]): string {
  if (accounts.length === 0) return '';

  const width = Math.max(...accounts.map((account) => account.email.length));

  return accounts
    .map(
      (account) =>
        `${account.email.padEnd(width)}  ${account.password}${account.role ? `  (${account.role})` : ''}`
    )
    .join('\n');
}

/**
 * Reads the demo panel settings.
 *
 * The login page calls this, so a database problem must not make signing in
 * impossible — on failure we log and report the panel as off, which is the safe
 * direction to fail in.
 */
export async function getDemoAccountSettings(): Promise<DemoAccountSettings> {
  try {
    const rows = await prisma.appSetting.findMany({
      where: { key: { in: [DEMO_KEYS.enabled, DEMO_KEYS.accounts] } },
      select: { key: true, value: true }
    });

    const enabled = rows.find((row) => row.key === DEMO_KEYS.enabled)?.value === 'true';
    const rawAccounts = rows.find((row) => row.key === DEMO_KEYS.accounts)?.value;

    return { enabled, accounts: rawAccounts ? readStoredAccounts(rawAccounts) : [] };
  } catch (error) {
    console.error('Failed to load demo account settings; hiding the panel.', error);
    return { ...EMPTY_DEMO_SETTINGS, accounts: [] };
  }
}

/**
 * Decodes the stored JSON, discarding anything malformed. The column is plain
 * text, so a hand-edited row must not throw its way into the login page.
 */
function readStoredAccounts(raw: string): DemoAccount[] {
  try {
    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (entry): entry is DemoAccount =>
          !!entry &&
          typeof entry === 'object' &&
          typeof (entry as DemoAccount).email === 'string' &&
          typeof (entry as DemoAccount).password === 'string'
      )
      .slice(0, DEMO_MAX_ACCOUNTS)
      .map((entry) => ({
        email: entry.email,
        password: entry.password,
        role: typeof entry.role === 'string' ? entry.role : ''
      }));
  } catch {
    return [];
  }
}
