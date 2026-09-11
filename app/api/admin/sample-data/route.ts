import { promises as fs } from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { recordActivity } from '@/lib/activity-log';
import { resolveUploadPath } from '@/lib/uploads';

export const dynamic = 'force-dynamic';

/** What the Admin panel shows before anyone presses the button. */
async function countSampleData() {
  const [requests, attachments, approvals, ledgerEntries, requestAuditLogs] = await Promise.all([
    prisma.activityRequest.count(),
    prisma.requestAttachment.count(),
    prisma.requestApproval.count(),
    prisma.fundLedgerEntry.count(),
    prisma.auditLog.count({ where: { requestId: { not: null } } })
  ]);

  return { requests, attachments, approvals, ledgerEntries, requestAuditLogs };
}

export async function GET() {
  const session = await getSession();

  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  return NextResponse.json({ counts: await countSampleData() });
}

/**
 * Clears every activity request and the whole fund ledger.
 *
 * This is the "the demo is over, start clean" button. It removes all requests
 * with their attachments (rows and files on disk), approvals, and the audit-log
 * entries tied to a request, then empties the fund ledger so every fund reads
 * zero — opening balances included, since those are sample money too.
 *
 * Deliberately kept: users, departments, fund sources themselves, voucher
 * signatories, branding, and the audit-log entries that are not about a
 * request (sign-ins, admin changes) — deleting those would erase the record of
 * this very operation.
 */
export async function DELETE(request: NextRequest) {
  const session = await getSession();

  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  let body: { confirm?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  // The UI asks twice; this makes a stray fetch from a console or a script
  // spell out the intent as well.
  if (body.confirm !== 'DELETE ALL') {
    return NextResponse.json(
      { error: 'This action needs an explicit confirmation.' },
      { status: 422 }
    );
  }

  const counts = await countSampleData();

  if (counts.requests === 0 && counts.ledgerEntries === 0) {
    return NextResponse.json({
      counts,
      filesDeleted: 0,
      filesMissing: 0,
      message: 'There was nothing to delete — no activity requests and no ledger entries.'
    });
  }

  // Read the storage keys before the rows go, otherwise the files are orphaned
  // on disk with nothing left pointing at them.
  const attachments = await prisma.requestAttachment.findMany({
    select: { fileName: true, fileUrl: true }
  });

  // Order matters: every one of these tables holds a foreign key into
  // ActivityRequest or FundSource, so the children have to go first.
  await prisma.$transaction([
    prisma.auditLog.deleteMany({ where: { requestId: { not: null } } }),
    prisma.requestApproval.deleteMany(),
    prisma.requestAttachment.deleteMany(),
    prisma.fundLedgerEntry.deleteMany(),
    prisma.activityRequest.deleteMany()
  ]);

  // Files come after the rows. A file left behind is untidy; a row pointing at
  // a file that is already gone is a broken download, so the rows go first.
  let filesDeleted = 0;
  let filesMissing = 0;

  for (const attachment of attachments) {
    const filePath = await resolveUploadPath(attachment.fileUrl);

    if (!filePath) {
      filesMissing += 1;
      continue;
    }

    try {
      await fs.unlink(filePath);
      filesDeleted += 1;
    } catch (error) {
      // Worth knowing about, but not worth failing the request for — the
      // database is already clean by this point.
      console.error(`Could not delete attachment file for ${attachment.fileName}.`, error);
      filesMissing += 1;
    }
  }

  await recordActivity({
    userId: session.id,
    action: 'SAMPLE_DATA_CLEARED',
    details:
      `Deleted ${counts.requests} activity request(s), ${counts.attachments} attachment(s) ` +
      `(${filesDeleted} file(s) removed from storage), ${counts.approvals} approval(s), and ` +
      `${counts.ledgerEntries} fund ledger entr(ies). All fund balances are now zero.`
  });

  return NextResponse.json({
    counts,
    filesDeleted,
    filesMissing,
    message:
      `Deleted ${counts.requests} activity request(s) and ${counts.attachments} attachment(s). ` +
      `All fund balances are now zero.`
  });
}
