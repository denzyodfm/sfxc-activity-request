import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface DepartmentRouteProps {
  params: { id: string };
}

export async function PUT(request: NextRequest, { params }: DepartmentRouteProps) {
  const body = await request.json();
  const { name, headId } = body;

  if (!name) {
    return NextResponse.json({ error: 'Department name is required.' }, { status: 422 });
  }

  const existingDepartment = await prisma.department.findUnique({ where: { id: params.id } });
  if (!existingDepartment) {
    return NextResponse.json({ error: 'Department not found.' }, { status: 404 });
  }

  const nameOwner = await prisma.department.findUnique({ where: { name } });
  if (nameOwner && nameOwner.id !== params.id) {
    return NextResponse.json({ error: 'Another department already uses this name.' }, { status: 400 });
  }

  if (headId) {
    const headUser = await prisma.user.findUnique({
      where: { id: headId },
      include: { headedDepartment: true }
    });

    if (!headUser) {
      return NextResponse.json({ error: 'Selected department head was not found.' }, { status: 404 });
    }

    if (!headUser.isDepartmentHead) {
      return NextResponse.json({ error: 'Selected user is not tagged as a department head.' }, { status: 400 });
    }

    if (headUser.headedDepartment && headUser.headedDepartment.id !== params.id) {
      return NextResponse.json({ error: 'Selected user is already assigned to another department.' }, { status: 400 });
    }
  }

  const updatedDepartment = await prisma.department.update({
    where: { id: params.id },
    data: { name, headId: headId || null }
  });

  return NextResponse.json({ department: updatedDepartment });
}

export async function DELETE(_request: NextRequest, { params }: DepartmentRouteProps) {
  const existingDepartment = await prisma.department.findUnique({
    where: { id: params.id },
    include: { _count: { select: { requests: true } } }
  });

  if (!existingDepartment) {
    return NextResponse.json({ error: 'Department not found.' }, { status: 404 });
  }

  if (existingDepartment._count.requests > 0) {
    return NextResponse.json({ error: 'This department is already used in request records and cannot be deleted.' }, { status: 400 });
  }

  await prisma.department.delete({ where: { id: params.id } });

  return NextResponse.json({ message: 'Department deleted.' });
}
