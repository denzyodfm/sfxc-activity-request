import { Prisma } from '@prisma/client';
import { UserSession } from '@/lib/auth';
import { isValidRole } from '@/lib/roles';

export interface ReportRange {
  from?: Date;
  to?: Date;
}

/**
 * Reads `from` and `to` (YYYY-MM-DD) out of the query string.
 *
 * `to` is pushed to the end of its day so a single-day range returns that day's
 * rows rather than nothing.
 */
export function parseReportRange(params: URLSearchParams): ReportRange | { error: string } {
  const range: ReportRange = {};
  const fromValue = params.get('from');
  const toValue = params.get('to');

  if (fromValue) {
    const from = new Date(`${fromValue}T00:00:00`);
    if (Number.isNaN(from.getTime())) return { error: 'The "from" date is invalid.' };
    range.from = from;
  }

  if (toValue) {
    const to = new Date(`${toValue}T23:59:59.999`);
    if (Number.isNaN(to.getTime())) return { error: 'The "to" date is invalid.' };
    range.to = to;
  }

  if (range.from && range.to && range.from > range.to) {
    return { error: 'The "from" date must not be after the "to" date.' };
  }

  return range;
}

/**
 * Builds the request filter for a report.
 *
 * The department restriction for a requestor is applied last and overwrites any
 * department supplied in the query string, so it cannot be widened by hand.
 */
export function buildRequestReportFilter(
  session: UserSession,
  params: URLSearchParams,
  range: ReportRange
): Prisma.ActivityRequestWhereInput {
  const where: Prisma.ActivityRequestWhereInput = {};

  if (range.from || range.to) {
    where.date = {
      ...(range.from ? { gte: range.from } : {}),
      ...(range.to ? { lte: range.to } : {})
    };
  }

  const status = params.get('status');
  if (status && status !== 'ALL') {
    where.status = status;
  }

  const departmentId = params.get('departmentId');
  if (departmentId && departmentId !== 'ALL') {
    where.departmentId = departmentId;
  }

  const fundSourceId = params.get('fundSourceId');
  if (fundSourceId && fundSourceId !== 'ALL') {
    where.fundSourceId = fundSourceId;
  }

  // Applied last: a requestor is confined to their own department (or their own
  // requests when they have none), whatever the query string asked for.
  if (session.role === 'REQUESTOR') {
    if (session.departmentId) {
      where.departmentId = session.departmentId;
    } else {
      where.departmentId = undefined;
      where.requestedById = session.id;
    }
  }

  return where;
}

/** Roles allowed to export the fund ledger, which spans every department. */
export function canExportLedger(role: string) {
  return isValidRole(role) && ['ADMIN', 'FUND_OFFICER', 'REVIEWER'].includes(role);
}
