import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { listCodeReleases, restoreSystemRevision, saveSystemRevision, startCodeRollback } from '@/lib/system-revisions';
import { recordActivity } from '@/lib/activity-log';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const revisions = await prisma.systemRevision.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { id: true, label: true, codeCommit: true, createdByName: true, createdAt: true, restoredAt: true }
  });

  let releases: ReturnType<typeof listCodeReleases> = [];
  try { releases = listCodeReleases(); } catch { /* Git metadata is unavailable in some local builds. */ }
  return NextResponse.json({ revisions, releases });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const body = await request.json();

  try {
    if (body.action === 'snapshot') {
      await saveSystemRevision(typeof body.label === 'string' && body.label.trim() ? body.label.trim() : 'Manual settings backup', session);
      return NextResponse.json({ message: 'Settings backup created.' });
    }
    if (body.action === 'restore-settings' && typeof body.revisionId === 'string') {
      await restoreSystemRevision(body.revisionId, session);
      await recordActivity({ userId: session.id, action: 'SETTINGS_REVISION_RESTORED', details: `Restored settings revision ${body.revisionId}.` });
      return NextResponse.json({ message: 'Settings restored. Active sessions may need to sign in again.' });
    }
    if (body.action === 'rollback-code' && typeof body.commit === 'string') {
      await recordActivity({ userId: session.id, action: 'CODE_ROLLBACK_STARTED', details: `Started code rollback to ${body.commit.slice(0, 12)}.` });
      startCodeRollback(body.commit);
      return NextResponse.json({ message: 'Code rollback started. The app will restart when the selected release is ready.' }, { status: 202 });
    }
    return NextResponse.json({ error: 'Invalid rollback request.' }, { status: 422 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Rollback failed.';
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
