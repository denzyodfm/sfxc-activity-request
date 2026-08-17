import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { verifyPassword } from '@/lib/password';
import { SESSION_COOKIE_NAME, getSessionCookieOptions } from '@/lib/session-cookie';
import { createSessionToken, verifySessionToken } from '@/lib/session-token';

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
 * The cookie carries only a signed user id — never the role or any other
 * authorisation data. Everything the caller authorises against is read from the
 * database on each call, so revoked accounts and changed roles take effect
 * immediately rather than persisting until the cookie expires.
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
      department: { select: { id: true, name: true } },
      headedDepartment: { select: { id: true, name: true } }
    }
  });

  if (!user) return null;

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
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, createSessionToken(userId), getSessionCookieOptions());
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
      department: { select: { id: true, name: true } },
      headedDepartment: { select: { id: true, name: true } }
    }
  });

  // Same message for an unknown email and a wrong password, so the response
  // cannot be used to enumerate valid accounts.
  const invalidCredentials = { success: false, error: 'Invalid email or password.' } as const;

  if (!user) {
    return invalidCredentials;
  }

  if (!verifyPassword(password, user.passwordHash)) {
    return invalidCredentials;
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

  return { success: true, user: session, token: createSessionToken(user.id) };
}

export async function logoutUser() {
  await clearSession();
}
