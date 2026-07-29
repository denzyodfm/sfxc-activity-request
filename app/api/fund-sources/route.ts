import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { recordActivity } from '@/lib/activity-log';

function canManageFunds(role: string) {
  return ['ADMIN', 'FUND_OFFICER'].includes(role);
}

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session || !canManageFunds(session.role)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const body = await request.json();
  const name = body.name?.toString().trim();
  const description = body.description?.toString().trim() || null;
  const parentId = body.parentId?.toString().trim() || null;

  if (!name) {
    return NextResponse.json({ error: 'Source of fund name is required.' }, { status: 422 });
  }

  if (parentId) {
    const parent = await prisma.fundSource.findUnique({
      where: { id: parentId },
      select: { id: true, parentId: true }
    });
    if (!parent) {
      return NextResponse.json({ error: 'Main account not found.' }, { status: 404 });
    }
    if (parent.parentId) {
      return NextResponse.json({ error: 'A sub-account cannot contain another sub-account.' }, { status: 422 });
    }
  }

  const fundSource = await prisma.fundSource.create({
    data: { name, description, parentId }
  });

  await recordActivity({
    userId: session.id,
    action: 'FUND_SOURCE_CREATED',
    details: `Created ${parentId ? 'sub-account' : 'main account'}: ${fundSource.name}.`
  });

  return NextResponse.json({ fundSource, message: 'Source of fund created.' });
}
