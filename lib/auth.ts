import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { verifyPassword, hashPassword, needsRehash } from '@/lib/password';
import { SESSION_COOKIE_NAME, getSessionCookieOptions } from '@/lib/session-cookie';
import { createSessionToken, verifySessionToken } from '@/lib/session-token';
import { MAX_FAILED_ATTEMPTS, LOCKOUT_MINUTES } from '@/lib/login-throttle';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: string;
  departmentId?: string;
  departmentName?: string;
}

/**
 * Resolves the signed session cookie to a user.
 *
 * The cookie carries only a signed user id and token version — never the role or
 * any other authorisation data. Everything the caller authorises against is read
 * from the database on each call, so revoked accounts, changed roles, and
 * deactivations take effect immediately rather than persisting until the cookie
 * expires.
 */
export async function getSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const payload = verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);

  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      tokenVersion: true,
      department: { select: { id: true, name: true } },
      headedDepartment: { select: { id: true, name: true } }
    }
  });

  if (!user) return null;

  // A deactivated account stops resolving mid-session rather than at the next
  // sign-in, so revoking access is immediate.
  if (!user.isActive) return null;

  // Bumping tokenVersion invalidates every token issued before the bump. This is
  // how "sign out everywhere" and forced re-authentication work.
  if (user.tokenVersion !== payload.ver) return null;

  const assignedDepartment = user.department ?? user.headedDepartment;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    departmentId: assignedDepartment?.id,
    departmentName: assignedDepartment?.name
  };
}

/** Issues a signed session cookie for the given user id. */
export async function setSession(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tokenVersion: true }
  });

  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE_NAME,
    createSessionToken(userId, user?.tokenVersion ?? 0),
    getSessionCookieOptions()
  );
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; user?: UserSession; token?: string }> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      passwordHash: true,
      role: true,
      isActive: true,
      tokenVersion: true,
      failedLoginCount: true,
      lockedUntil: true,
      department: { select: { id: true, name: true } },
      headedDepartment: { select: { id: true, name: true } }
    }
  });

  // Same message for an unknown email, a wrong password, and a deactivated
  // account, so the response cannot be used to enumerate valid accounts.
  const invalidCredentials = { success: false, error: 'Invalid email or password.' } as const;

  if (!user) {
    return invalidCredentials;
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutesLeft = Math.max(1, Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000));
    return {
      success: false,
      error: `Too many failed sign-in attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? '' : 's'}.`
    };
  }

  if (!verifyPassword(password, user.passwordHash)) {
    // Count the failure and lock the account once the budget is spent. The
    // counter is reset by a successful sign-in below.
    const failedLoginCount = user.failedLoginCount + 1;
    const shouldLock = failedLoginCount >= MAX_FAILED_ATTEMPTS;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: shouldLock ? 0 : failedLoginCount,
        lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) : null
      }
    });

    return invalidCredentials;
  }

  // Correct password, but the account is switched off.
  if (!user.isActive) {
    return invalidCredentials;
  }

  // The password is correct, so the plaintext is available here — the only
  // moment an old hash can be upgraded without asking the user to reset it.
  const upgradedHash = needsRehash(user.passwordHash) ? hashPassword(password) : null;

  if (upgradedHash || user.failedLoginCount > 0 || user.lockedUntil) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(upgradedHash ? { passwordHash: upgradedHash } : {}),
        failedLoginCount: 0,
        lockedUntil: null
      }
    });
  }

  const assignedDepartment = user.department ?? user.headedDepartment;

  const session: UserSession = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    departmentId: assignedDepartment?.id,
    departmentName: assignedDepartment?.name
  };

  return { success: true, user: session, token: createSessionToken(user.id, user.tokenVersion) };
}

export async function logoutUser() {
  await clearSession();
}
