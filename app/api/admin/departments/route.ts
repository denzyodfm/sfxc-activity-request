import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
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

  const newDept = await prisma.department.create({
    data: { name, headId: headId || undefined }
  });

  return NextResponse.json({ department: newDept });
}
