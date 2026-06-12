import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/password';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, email, role, departmentId, password } = body;

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

    if (department.headId) {
      return NextResponse.json({ error: 'Department is already assigned to another user.' }, { status: 400 });
    }
  }

  const newUser = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: { name, email, role, passwordHash: hashPassword(password) }
    });

    if (departmentId) {
      await tx.department.update({
        where: { id: departmentId },
        data: { headId: createdUser.id }
      });
    }

    return createdUser;
  });

  return NextResponse.json({ user: newUser });
}
