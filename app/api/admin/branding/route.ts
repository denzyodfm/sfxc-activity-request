import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { recordActivity } from '@/lib/activity-log';
import { BRANDING_KEYS, BRANDING_MAX_LENGTH, Branding, getBranding } from '@/lib/branding';

const fields = Object.keys(BRANDING_KEYS) as (keyof Branding)[];

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  return NextResponse.json({ branding: await getBranding() });
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const body = await request.json();
  const branding = body?.branding;

  if (!branding || typeof branding !== 'object') {
    return NextResponse.json({ error: 'A branding object is required.' }, { status: 422 });
  }

  // Trim, but keep empty strings — an empty value hides that part of the lockup.
  const values = {} as Branding;

  for (const field of fields) {
    const value = branding[field];

    if (typeof value !== 'string') {
      return NextResponse.json({ error: `${field} must be text.` }, { status: 422 });
    }

    const trimmed = value.trim();

    if (trimmed.length > BRANDING_MAX_LENGTH) {
      return NextResponse.json(
        { error: `${field} must be ${BRANDING_MAX_LENGTH} characters or fewer.` },
        { status: 422 }
      );
    }

    values[field] = trimmed;
  }

  await prisma.$transaction(
    fields.map((field) =>
      prisma.appSetting.upsert({
        where: { key: BRANDING_KEYS[field] },
        update: { value: values[field] },
        create: { key: BRANDING_KEYS[field], value: values[field] }
      })
    )
  );

  await recordActivity({
    userId: session.id,
    action: 'BRANDING_UPDATED',
    details: 'Updated the footer branding shown on every page.'
  });

  return NextResponse.json({ branding: values, message: 'Footer branding updated.' });
}
