const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function getLatestBalance(fundSourceId, tx) {
  const latestEntry = await tx.fundLedgerEntry.findFirst({
    where: { fundSourceId },
    orderBy: { createdAt: 'desc' },
    select: { balanceAfter: true }
  });

  return Number(latestEntry?.balanceAfter ?? 0);
}

async function main() {
  await prisma.$transaction(async (tx) => {
    const renamed = await tx.activityRequest.updateMany({
      where: { status: 'DONE' },
      data: { status: 'COMPLETED' }
    });

    const completedRequests = await tx.activityRequest.findMany({
      where: {
        status: 'COMPLETED',
        fundSourceId: { not: null }
      },
      select: {
        id: true,
        controlNumber: true,
        amount: true,
        fundSourceId: true,
        approvedById: true
      },
      orderBy: { updatedAt: 'asc' }
    });

    let createdLedgerEntries = 0;

    for (const request of completedRequests) {
      const existingEntry = await tx.fundLedgerEntry.findFirst({
        where: {
          requestId: request.id,
          type: 'REQUEST_COMPLETION'
        }
      });

      if (existingEntry || !request.fundSourceId) {
        continue;
      }

      const previousBalance = await getLatestBalance(request.fundSourceId, tx);
      const amount = Number(request.amount);

      await tx.fundLedgerEntry.create({
        data: {
          fundSourceId: request.fundSourceId,
          requestId: request.id,
          actorId: request.approvedById,
          type: 'REQUEST_COMPLETION',
          description: `Completed request ${request.controlNumber}`,
          debit: 0,
          credit: amount,
          balanceAfter: previousBalance - amount
        }
      });

      await tx.auditLog.create({
        data: {
          requestId: request.id,
          userId: request.approvedById,
          action: 'COMPLETED_VOUCHER_BACKFILL',
          details: 'Created missing source-of-fund deduction for completed voucher.'
        }
      });

      createdLedgerEntries += 1;
    }

    console.log(`Updated ${renamed.count} DONE request(s) to COMPLETED.`);
    console.log(`Created ${createdLedgerEntries} missing voucher deduction ledger entr${createdLedgerEntries === 1 ? 'y' : 'ies'}.`);
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
