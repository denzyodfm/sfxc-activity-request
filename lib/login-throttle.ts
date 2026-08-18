/**
 * Login throttling, in two layers.
 *
 * Per account (durable, in the User table): after MAX_FAILED_ATTEMPTS wrong
 * passwords the account locks for LOCKOUT_MINUTES. This survives a restart and
 * stops someone grinding one known email address.
 *
 * Per client address (in memory, here): a sliding window over all login
 * attempts from one IP, regardless of which account they targeted. This catches
 * password spraying — one common password tried against many accounts — which
 * the per-account counter alone would never notice. It resets on restart, which
 * is acceptable for a second layer.
 */

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 15;

const IP_WINDOW_MS = 10 * 60 * 1000;
const IP_MAX_ATTEMPTS = 20;

const attemptsByIp = new Map<string, number[]>();

// Without this the map grows for as long as the process lives.
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < IP_WINDOW_MS) return;

  for (const [ip, timestamps] of attemptsByIp) {
    const fresh = timestamps.filter((timestamp) => now - timestamp < IP_WINDOW_MS);

    if (fresh.length === 0) {
      attemptsByIp.delete(ip);
    } else {
      attemptsByIp.set(ip, fresh);
    }
  }

  lastSweep = now;
}

/**
 * Best-effort client address. A reverse proxy must set X-Forwarded-For; when
 * nothing identifies the client we fall back to a single shared bucket, which
 * throttles conservatively rather than not at all.
 */
export function getClientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

/** True when this address has exceeded its attempt budget. */
export function isIpThrottled(ip: string) {
  const now = Date.now();
  sweep(now);

  const timestamps = attemptsByIp.get(ip) ?? [];
  return timestamps.filter((timestamp) => now - timestamp < IP_WINDOW_MS).length >= IP_MAX_ATTEMPTS;
}

export function recordIpAttempt(ip: string) {
  const now = Date.now();
  const timestamps = (attemptsByIp.get(ip) ?? []).filter((timestamp) => now - timestamp < IP_WINDOW_MS);

  timestamps.push(now);
  attemptsByIp.set(ip, timestamps);
}

/** Clears an address's history after a successful sign-in. */
export function clearIpAttempts(ip: string) {
  attemptsByIp.delete(ip);
}
