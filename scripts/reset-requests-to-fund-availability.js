const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const requests = await prisma.activityRequest.findMany({
    select: { id: true, controlNumber: true }
  });

  await prisma.$transaction([
    prisma.activityRequest.updateMany({
      data: {
        status: 'FOR_FUND_AVAILABILITY',
        fundAvailable: null,
        fundAvailabilityRemarks: null,
        reviewRemarks: null,
        endorsementRemarks: null,
        approvalRemarks: null,
        finalApprover: null,
        approvedById: null
      }
    }),
    prisma.auditLog.createMany({
      data: requests.map((request) => ({
        requestId: request.id,
        action: 'REQUEST_RESET_FOR_TESTING',
        details: `${request.controlNumber} was reset to fund availability for workflow and voucher testing.`
      }))
    })
  ]);

  console.log(`Reset ${requests.length} request(s) to FOR_FUND_AVAILABILITY.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
