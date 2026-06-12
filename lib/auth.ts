'use server';

import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { verifyPassword } from '@/lib/password';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: string;
  departmentId?: string;
}

export async function getSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const sessionData = cookieStore.get('session')?.value;
  
  if (!sessionData) return null;
  
  try {
    return JSON.parse(sessionData) as UserSession;
  } catch {
    return null;
  }
}

export async function setSession(user: UserSession) {
  const cookieStore = await cookies();
  cookieStore.set('session', JSON.stringify(user), {
    maxAge: 7 * 24 * 60 * 60,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}

export async function loginUser(email: string, password: string): Promise<{ success: boolean; error?: string; user?: UserSession }> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      passwordHash: true,
      role: true,
      headedDepartment: {
        select: { id: true }
      }
    }
  });

  if (!user) {
    return { success: false, error: 'User not found.' };
  }

  if (!verifyPassword(password, user.passwordHash)) {
    return { success: false, error: 'Invalid password.' };
  }

  const session: UserSession = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    departmentId: user.headedDepartment?.id
  };

  await setSession(session);
  return { success: true, user: session };
}

export async function logoutUser() {
  await clearSession();
}
