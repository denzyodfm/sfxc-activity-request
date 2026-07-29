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

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session || !canManageFunds(session.role)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const body = await request.json();
  const id = body.id?.toString().trim();
  const name = body.name?.toString().trim();
  const description = body.description?.toString().trim() || null;
  const parentId = body.parentId?.toString().trim() || null;
  if (!id || !name) {
    return NextResponse.json({ error: 'Account and account name are required.' }, { status: 422 });
  }
  if (parentId === id) {
    return NextResponse.json({ error: 'An account cannot be its own main account.' }, { status: 422 });
  }

  const [source, parent, duplicate] = await Promise.all([
    prisma.fundSource.findUnique({ where: { id }, include: { subAccounts: { select: { id: true } } } }),
    parentId ? prisma.fundSource.findUnique({ where: { id: parentId }, select: { id: true, parentId: true } }) : null,
    prisma.fundSource.findFirst({ where: { name, NOT: { id } }, select: { id: true } })
  ]);
  if (!source) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
  if (duplicate) return NextResponse.json({ error: 'An account with this name already exists.' }, { status: 422 });
  if (parentId && (!parent || parent.parentId)) {
    return NextResponse.json({ error: 'Please select a valid main account.' }, { status: 422 });
  }
  if (parentId && source.subAccounts.length) {
    return NextResponse.json({ error: 'A main account with sub-accounts cannot itself become a sub-account.' }, { status: 422 });
  }

  const fundSource = await prisma.fundSource.update({
    where: { id },
    data: { name, description, parentId }
  });
  await recordActivity({
    userId: session.id,
    action: 'FUND_SOURCE_UPDATED',
    details: `Updated ${parentId ? 'sub-account' : 'main account'}: ${fundSource.name}.`
  });
  return NextResponse.json({ fundSource, message: 'Source of fund updated.' });
}
