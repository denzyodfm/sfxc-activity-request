import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { recordActivity } from '@/lib/activity-log';
import {
  DEMO_KEYS,
  DEMO_MAX_ACCOUNTS,
  DemoAccount,
  getDemoAccountSettings
} from '@/lib/demo-accounts';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();

  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  return NextResponse.json({ settings: await getDemoAccountSettings() });
}

export async function PUT(request: NextRequest) {
  const session = await getSession();

  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  let body: { enabled?: unknown; accounts?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (typeof body.enabled !== 'boolean') {
    return NextResponse.json({ error: 'enabled must be true or false.' }, { status: 422 });
  }

  if (!Array.isArray(body.accounts)) {
    return NextResponse.json({ error: 'accounts must be a list.' }, { status: 422 });
  }

  if (body.accounts.length > DEMO_MAX_ACCOUNTS) {
    return NextResponse.json(
      { error: `Please list ${DEMO_MAX_ACCOUNTS} accounts or fewer.` },
      { status: 422 }
    );
  }

  const accounts: DemoAccount[] = [];

  for (const entry of body.accounts) {
    if (!entry || typeof entry !== 'object') {
      return NextResponse.json({ error: 'Each account must be an object.' }, { status: 422 });
    }

    const { email, password, role } = entry as Record<string, unknown>;

    if (typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Each account needs an email and a password.' },
        { status: 422 }
      );
    }

    accounts.push({
      email: email.trim().toLowerCase(),
      password,
      role: typeof role === 'string' ? role.trim() : ''
    });
  }

  // Turning the panel on is the part worth being loud about, so the audit log
  // records the transition rather than just "settings saved".
  const previous = await getDemoAccountSettings();

  await prisma.$transaction([
    prisma.appSetting.upsert({
      where: { key: DEMO_KEYS.enabled },
      update: { value: String(body.enabled) },
      create: { key: DEMO_KEYS.enabled, value: String(body.enabled) }
    }),
    prisma.appSetting.upsert({
      where: { key: DEMO_KEYS.accounts },
      update: { value: JSON.stringify(accounts) },
      create: { key: DEMO_KEYS.accounts, value: JSON.stringify(accounts) }
    })
  ]);

  await recordActivity({
    userId: session.id,
    action: body.enabled === previous.enabled ? 'DEMO_ACCOUNTS_UPDATED' : 'DEMO_ACCOUNTS_TOGGLED',
    details: body.enabled
      ? `Sign-in page is showing ${accounts.length} demo account(s).`
      : 'Sign-in page is no longer showing demo accounts.'
  });

  return NextResponse.json({
    settings: { enabled: body.enabled, accounts },
    message: body.enabled
      ? `Saved. The sign-in page now lists ${accounts.length} demo account(s).`
      : 'Saved. The sign-in page no longer shows demo accounts.'
  });
}
