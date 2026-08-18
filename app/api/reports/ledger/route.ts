import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { toCsv, csvResponse, csvDate } from '@/lib/csv';
import { recordActivity } from '@/lib/activity-log';
import { parseReportRange, canExportLedger } from '@/lib/reports';

export const dynamic = 'force-dynamic';

/**
 * Fund ledger as CSV, with a running balance.
 *
 * The ledger spans every department and shows the school's cash position, so it
 * is restricted to the roles that already manage funds.
 */
export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session || !canExportLedger(session.role)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const range = parseReportRange(searchParams);

  if ('error' in range) {
    return NextResponse.json({ error: range.error }, { status: 422 });
  }

  const fundSourceId = searchParams.get('fundSourceId');

  const entries = await prisma.fundLedgerEntry.findMany({
    where: {
      ...(fundSourceId && fundSourceId !== 'ALL' ? { fundSourceId } : {}),
      ...(range.from || range.to
        ? {
            transactionDate: {
              ...(range.from ? { gte: range.from } : {}),
              ...(range.to ? { lte: range.to } : {})
            }
          }
        : {})
    },
    orderBy: [{ fundSourceId: 'asc' }, { transactionDate: 'asc' }, { createdAt: 'asc' }],
    include: {
      fundSource: { select: { name: true, parent: { select: { name: true } } } },
      actor: { select: { name: true } },
      request: { select: { controlNumber: true } }
    }
  });

  const body = toCsv(
    [
      'Fund Account',
      'Sub-Account',
      'Transaction Date',
      'Type',
      'Description',
      'Reference',
      'Control Number',
      'Posted By',
      'Debit',
      'Credit',
      'Balance After',
      'Posted At'
    ],
    entries.map((entry) => [
      entry.fundSource.parent?.name ?? entry.fundSource.name,
      entry.fundSource.parent ? entry.fundSource.name : '',
      csvDate(entry.transactionDate),
      entry.type.replace(/_/g, ' '),
      entry.description,
      entry.reference ?? '',
      entry.request?.controlNumber ?? '',
      entry.actor?.name ?? 'System',
      Number(entry.debit).toFixed(2),
      Number(entry.credit).toFixed(2),
      Number(entry.balanceAfter).toFixed(2),
      csvDate(entry.createdAt)
    ])
  );

  await recordActivity({
    userId: session.id,
    action: 'REPORT_EXPORTED',
    details: `Exported ${entries.length} fund ledger entr${entries.length === 1 ? 'y' : 'ies'} to CSV.`
  });

  return csvResponse(`sfxc-fund-ledger-${new Date().toISOString().slice(0, 10)}.csv`, body);
}
