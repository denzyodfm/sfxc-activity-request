import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * One request's disbursement voucher, including the approval codes and the
 * timestamps behind them.
 *
 * The dashboard's request list holds only the summary fields, so the voucher is
 * fetched on demand when a row is expanded rather than joined into every row of
 * the dashboard query.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const activityRequest = await prisma.activityRequest.findUnique({
    where: { id: params.id },
    include: {
      department: { select: { name: true } },
      requestedBy: { select: { name: true } },
      fundSource: { select: { name: true, parent: { select: { name: true } } } },
      approvals: {
        orderBy: { createdAt: 'desc' },
        select: {
          role: true,
          action: true,
          approvalCode: true,
          createdAt: true,
          actor: { select: { name: true, role: true } }
        }
      }
    }
  });

  if (!activityRequest) {
    return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
  }

  // The same scoping the dashboard applies to its own query: a requestor sees
  // their department, or just their own requests when they have no department.
  if (session.role === 'REQUESTOR') {
    const visible = session.departmentId
      ? activityRequest.departmentId === session.departmentId
      : activityRequest.requestedById === session.id;

    if (!visible) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }
  }

  const [signatories, jca, jmapc] = await Promise.all([
    prisma.voucherSignatory.findMany(),
    prisma.user.findFirst({ where: { role: 'APPROVER_JCA' }, select: { name: true } }),
    prisma.user.findFirst({ where: { role: 'APPROVER_JMAPC' }, select: { name: true } })
  ]);

  return NextResponse.json({
    request: {
      id: activityRequest.id,
      controlNumber: activityRequest.controlNumber,
      date: activityRequest.date.toISOString(),
      particulars: activityRequest.particulars,
      // Decimal does not survive JSON, and the voucher only ever reads this as
      // a number.
      amount: Number(activityRequest.amount),
      voucherPayTo: activityRequest.voucherPayTo,
      voucherAddress: activityRequest.voucherAddress,
      voucherNumber: activityRequest.voucherNumber,
      voucherParticulars: activityRequest.voucherParticulars,
      department: activityRequest.department,
      requestedBy: activityRequest.requestedBy,
      fundSource: activityRequest.fundSource,
      approvals: activityRequest.approvals.map((approval) => ({
        role: approval.role,
        action: approval.action,
        approvalCode: approval.approvalCode,
        createdAt: approval.createdAt.toISOString(),
        actor: approval.actor
      }))
    },
    signatories,
    roleNames: { jca: jca?.name, jmapc: jmapc?.name }
  });
}
