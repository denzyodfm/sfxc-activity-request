import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, validatePassword } from '@/lib/password';
import { getSession } from '@/lib/auth';
import { recordActivity } from '@/lib/activity-log';
import { isValidRole } from '@/lib/roles';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const body = await request.json();
  const { name, role, departmentId, password, isDepartmentHead } = body;
  // Stored lower-case so the address is unambiguous, matching how the login
  // route normalises what the user types.
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

  if (!name || !email || !role || !password) {
    return NextResponse.json({ error: 'Name, email, role, and password are required.' }, { status: 422 });
  }

  if (!isValidRole(role)) {
    return NextResponse.json({ error: 'That is not a valid role.' }, { status: 422 });
  }

  const policyError = validatePassword(password);
  if (policyError) {
    return NextResponse.json({ error: policyError }, { status: 422 });
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json({ error: 'User with this email already exists.' }, { status: 400 });
  }

  if (departmentId) {
    const department = await prisma.department.findUnique({ where: { id: departmentId } });

    if (!department) {
      return NextResponse.json({ error: 'Department not found.' }, { status: 404 });
    }
  }

  const newUser = await prisma.user.create({
    data: {
      name,
      email,
      role,
      isDepartmentHead: Boolean(isDepartmentHead),
      passwordHash: hashPassword(password),
      departmentId: departmentId || null
    }
  });

  await recordActivity({
    userId: session.id,
    action: 'USER_CREATED',
    details: `Created user ${newUser.name} (${newUser.email}) with role ${newUser.role}.`
  });

  return NextResponse.json({ user: newUser });
}
