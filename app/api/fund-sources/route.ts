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
  const accountType = body.accountType?.toString();
  const parentId = body.parentId?.toString().trim() || null;

  if (!name) {
    return NextResponse.json({ error: 'Source of fund name is required.' }, { status: 422 });
  }
  if (!['main', 'sub'].includes(accountType)) {
    return NextResponse.json({ error: 'Please select a valid account type.' }, { status: 422 });
  }
  if (accountType === 'sub' && !parentId) {
    return NextResponse.json({ error: 'A main account is required for a sub-account.' }, { status: 422 });
  }
  if (accountType === 'main' && parentId) {
    return NextResponse.json({ error: 'A main account cannot have a parent account.' }, { status: 422 });
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
  if (!id || !name) {
    return NextResponse.json({ error: 'Account and account name are required.' }, { status: 422 });
  }

  const [source, duplicate] = await Promise.all([
    prisma.fundSource.findUnique({ where: { id }, select: { id: true, parentId: true } }),
    prisma.fundSource.findFirst({ where: { name, NOT: { id } }, select: { id: true } })
  ]);
  if (!source) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
  if (duplicate) return NextResponse.json({ error: 'An account with this name already exists.' }, { status: 422 });

  const fundSource = await prisma.fundSource.update({
    where: { id },
    data: { name, description }
  });
  await recordActivity({
    userId: session.id,
    action: 'FUND_SOURCE_UPDATED',
    details: `Updated ${source.parentId ? 'sub-account' : 'main account'}: ${fundSource.name}.`
  });
  return NextResponse.json({ fundSource, message: 'Source of fund updated.' });
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session || !canManageFunds(session.role)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const body = await request.json();
  const id = body.id?.toString().trim();
  const confirmation = body.confirmation?.toString();
  if (!id || confirmation !== 'DELETE') {
    return NextResponse.json({ error: 'Type DELETE exactly to confirm account deletion.' }, { status: 422 });
  }

  const source = await prisma.fundSource.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      _count: { select: { subAccounts: true, requests: true, ledgerEntries: true } }
    }
  });
  if (!source) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });

  if (source._count.subAccounts > 0) {
    return NextResponse.json({ error: 'This main account still has sub-accounts. Delete or reassign them first.' }, { status: 409 });
  }
  if (source._count.requests > 0) {
    return NextResponse.json({ error: 'This account is assigned to existing requests and cannot be deleted.' }, { status: 409 });
  }
  if (source._count.ledgerEntries > 0) {
    return NextResponse.json({ error: 'This account has ledger history and cannot be deleted.' }, { status: 409 });
  }

  await prisma.fundSource.delete({ where: { id: source.id } });
  await recordActivity({
    userId: session.id,
    action: 'FUND_SOURCE_DELETED',
    details: `Deleted source of fund: ${source.name}.`
  });
  return NextResponse.json({ message: `${source.name} was deleted.` });
}
