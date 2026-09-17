import prisma from '@/lib/prisma';
import { saveRevisionForAdminAction } from '@/lib/system-revisions';

export async function recordActivity({
  userId,
  requestId,
  action,
  details
}: {
  userId?: string | null;
  requestId?: string | null;
  action: string;
  details?: string | null;
}) {
  const log = await prisma.auditLog.create({
    data: {
      userId: userId ?? null,
      requestId: requestId ?? null,
      action,
      details: details ?? null
    }
  });

  await saveRevisionForAdminAction(action, details, userId);
  return log;
}
