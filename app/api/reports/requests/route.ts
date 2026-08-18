import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { toCsv, csvResponse, csvDate } from '@/lib/csv';
import { recordActivity } from '@/lib/activity-log';
import { buildRequestReportFilter, parseReportRange } from '@/lib/reports';

export const dynamic = 'force-dynamic';

/**
 * Activity requests as CSV.
 *
 * A requestor only ever receives their own department's rows — the same
 * restriction the dashboard applies — so this cannot be used to read around the
 * department boundary.
 */
export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const range = parseReportRange(searchParams);

  if ('error' in range) {
    return NextResponse.json({ error: range.error }, { status: 422 });
  }

  const where = buildRequestReportFilter(session, searchParams, range);

  const requests = await prisma.activityRequest.findMany({
    where,
    orderBy: { date: 'desc' },
    include: {
      department: { select: { name: true } },
      requestedBy: { select: { name: true } },
      approvedBy: { select: { name: true } },
      fundSource: { select: { name: true, parent: { select: { name: true } } } }
    }
  });

  const body = toCsv(
    [
      'Control Number',
      'Date',
      'Department',
      'Requested By',
      'Particulars',
      'Amount',
      'Status',
      'Fund Account',
      'Fund Sub-Account',
      'Final Approver',
      'Approved By',
      'Voucher Number',
      'Fund Availability Remarks',
      'Review Remarks',
      'Endorsement Remarks',
      'Approval Remarks',
      'Created',
      'Last Updated'
    ],
    requests.map((item) => [
      item.controlNumber,
      csvDate(item.date),
      item.department.name,
      item.requestedBy.name,
      item.particulars,
      Number(item.amount).toFixed(2),
      item.status.replace(/_/g, ' '),
      item.fundSource?.parent?.name ?? item.fundSource?.name ?? '',
      item.fundSource?.parent ? item.fundSource.name : '',
      item.finalApprover?.replace('APPROVER_', '') ?? '',
      item.approvedBy?.name ?? '',
      item.voucherNumber ?? '',
      item.fundAvailabilityRemarks ?? '',
      item.reviewRemarks ?? '',
      item.endorsementRemarks ?? '',
      item.approvalRemarks ?? '',
      csvDate(item.createdAt),
      csvDate(item.updatedAt)
    ])
  );

  await recordActivity({
    userId: session.id,
    action: 'REPORT_EXPORTED',
    details: `Exported ${requests.length} activity request(s) to CSV.`
  });

  return csvResponse(`sfxc-activity-requests-${new Date().toISOString().slice(0, 10)}.csv`, body);
}
