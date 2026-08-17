import { createHmac, timingSafeEqual } from 'crypto';

export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export interface SessionTokenPayload {
  /** User id. */
  sub: string;
  /** Issued at (seconds since epoch). */
  iat: number;
  /** Expires at (seconds since epoch). */
  exp: number;
}

/**
 * Missing or weak secrets are a configuration error, not a failed login, so this
 * throws rather than returning null. A misconfigured deployment fails every
 * request loudly instead of silently falling back to unsigned sessions.
 */
function getSecret() {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error(
      'SESSION_SECRET is not set. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  if (secret.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters.');
  }

  return secret;
}

function sign(encodedPayload: string) {
  return createHmac('sha256', getSecret()).update(encodedPayload).digest('base64url');
}

function safeEquals(a: string, b: string) {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);

  // timingSafeEqual throws on length mismatch, so compare lengths first. The
  // length of an HMAC digest is not secret.
  if (bufferA.length !== bufferB.length) {
    return false;
  }

  return timingSafeEqual(new Uint8Array(bufferA), new Uint8Array(bufferB));
}

export function createSessionToken(userId: string, now = new Date()) {
  const issuedAt = Math.floor(now.getTime() / 1000);
  const payload: SessionTokenPayload = {
    sub: userId,
    iat: issuedAt,
    exp: issuedAt + SESSION_TTL_SECONDS
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');

  return `${encodedPayload}.${sign(encodedPayload)}`;
}

/**
 * Returns null for anything that is not a valid, unexpired, correctly signed
 * token. Callers treat null as "not signed in".
 */
export function verifySessionToken(token: string | undefined | null): SessionTokenPayload | null {
  if (!token) return null;

  const separatorIndex = token.lastIndexOf('.');
  if (separatorIndex <= 0) return null;

  const encodedPayload = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);

  if (!safeEquals(signature, sign(encodedPayload))) {
    return null;
  }

  let payload: SessionTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (typeof payload?.sub !== 'string' || !payload.sub) return null;
  if (typeof payload.exp !== 'number' || typeof payload.iat !== 'number') return null;

  // The expiry is enforced here, not just by the cookie's maxAge, so that a
  // client holding on to an old cookie cannot extend its own session.
  if (payload.exp * 1000 <= Date.now()) return null;

  return payload;
}
