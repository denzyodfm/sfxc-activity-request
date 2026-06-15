import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

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

  if (!name) {
    return NextResponse.json({ error: 'Source of fund name is required.' }, { status: 422 });
  }

  const fundSource = await prisma.fundSource.create({
    data: { name, description }
  });

  return NextResponse.json({ fundSource, message: 'Source of fund created.' });
}
