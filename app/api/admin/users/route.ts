import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { getSession } from '@/lib/auth';
import { recordActivity } from '@/lib/activity-log';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const body = await request.json();
  const { name, email, role, departmentId, password, isDepartmentHead } = body;

  if (!name || !email || !role || !password) {
    return NextResponse.json({ error: 'Name, email, role, and password are required.' }, { status: 422 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 422 });
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
