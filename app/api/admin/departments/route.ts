import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { recordActivity } from '@/lib/activity-log';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const body = await request.json();
  const { name, headId } = body;

  if (!name) {
    return NextResponse.json({ error: 'Department name is required.' }, { status: 422 });
  }

  const existingDept = await prisma.department.findUnique({ where: { name } });
  if (existingDept) {
    return NextResponse.json({ error: 'Department with this name already exists.' }, { status: 400 });
  }

  if (headId) {
    const headUser = await prisma.user.findUnique({
      where: { id: headId },
      include: { headedDepartment: true }
    });

    if (!headUser) {
      return NextResponse.json({ error: 'Selected department head was not found.' }, { status: 404 });
    }

    if (headUser.headedDepartment) {
      return NextResponse.json({ error: 'Selected user is already assigned to another department.' }, { status: 400 });
    }
  }

  const newDept = await prisma.$transaction(async (tx) => {
    const department = await tx.department.create({
      data: { name, headId: headId || undefined }
    });

    if (headId) {
      await tx.user.update({
        where: { id: headId },
        data: {
          isDepartmentHead: true,
          departmentId: department.id
        }
      });
    }

    return department;
  });

  await recordActivity({
    userId: session.id,
    action: 'DEPARTMENT_CREATED',
    details: `Created department: ${newDept.name}.`
  });

  return NextResponse.json({ department: newDept });
}
