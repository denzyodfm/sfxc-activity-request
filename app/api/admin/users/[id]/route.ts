import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface UserRouteProps {
  params: { id: string };
}

export async function PUT(request: NextRequest, { params }: UserRouteProps) {
  const body = await request.json();
  const { name, email, role, departmentId, isDepartmentHead } = body;

  if (!name || !email || !role) {
    return NextResponse.json({ error: 'Name, email, and role are required.' }, { status: 422 });
  }

  const existingUser = await prisma.user.findUnique({
    where: { id: params.id },
    include: { headedDepartment: true }
  });
  if (!existingUser) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  const emailOwner = await prisma.user.findUnique({ where: { email } });
  if (emailOwner && emailOwner.id !== params.id) {
    return NextResponse.json({ error: 'Another user already uses this email.' }, { status: 400 });
  }

  if (departmentId) {
    const department = await prisma.department.findUnique({ where: { id: departmentId } });

    if (!department) {
      return NextResponse.json({ error: 'Department not found.' }, { status: 404 });
    }

  }

  if (!Boolean(isDepartmentHead) && existingUser.headedDepartment) {
    return NextResponse.json({ error: 'Remove this user as department head before unchecking department head.' }, { status: 400 });
  }

  const updatedUser = await prisma.user.update({
    where: { id: params.id },
    data: {
      name,
      email,
      role,
      isDepartmentHead: Boolean(isDepartmentHead),
      departmentId: departmentId || null
    }
  });

  return NextResponse.json({ user: updatedUser });
}

export async function DELETE(_request: NextRequest, { params }: UserRouteProps) {
  const existingUser = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      _count: {
        select: {
          requests: true,
          approvedRequests: true,
          approvals: true,
          auditLogs: true,
          fundLedgerEntries: true
        }
      }
    }
  });

  if (!existingUser) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  const isUsed =
    existingUser._count.requests > 0 ||
    existingUser._count.approvedRequests > 0 ||
    existingUser._count.approvals > 0 ||
    existingUser._count.auditLogs > 0 ||
    existingUser._count.fundLedgerEntries > 0;

  if (isUsed) {
    return NextResponse.json({ error: 'This user is already used in request records and cannot be deleted.' }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.department.updateMany({
      where: { headId: params.id },
      data: { headId: null }
    });

    await tx.user.delete({ where: { id: params.id } });
  });

  return NextResponse.json({ message: 'User deleted.' });
}
