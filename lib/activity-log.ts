import prisma from '@/lib/prisma';

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
  return prisma.auditLog.create({
    data: {
      userId: userId ?? null,
      requestId: requestId ?? null,
      action,
      details: details ?? null
    }
  });
}
