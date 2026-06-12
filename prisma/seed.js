const { PrismaClient } = require('@prisma/client');
const { createHash } = require('crypto');

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = 'sfxc-demo-salt';
  const hash = createHash('sha256').update(`${salt}:${password}`).digest('hex');
  return `sha256$${salt}$${hash}`;
}

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.requestApproval.deleteMany();
  await prisma.requestAttachment.deleteMany();
  await prisma.activityRequest.deleteMany();
  await prisma.fundSource.deleteMany();
  await prisma.department.deleteMany();
  await prisma.user.deleteMany();

  const [admin, requestor, fundOfficer, reviewer, endorser, approverJMAPC, approverJCA] = await Promise.all([
    prisma.user.create({ data: { name: 'System Admin', email: 'admin@sfxc.edu', role: 'ADMIN', passwordHash: hashPassword('password') } }),
    prisma.user.create({ data: { name: 'Nina Reyes', email: 'nina.reyes@sfxc.edu', role: 'REQUESTOR', passwordHash: hashPassword('password') } }),
    prisma.user.create({ data: { name: 'Marcos Dela Cruz', email: 'marcos.dc@sfxc.edu', role: 'FUND_OFFICER', passwordHash: hashPassword('password') } }),
    prisma.user.create({ data: { name: 'Liza Santos', email: 'liza.santos@sfxc.edu', role: 'REVIEWER', passwordHash: hashPassword('password') } }),
    prisma.user.create({ data: { name: 'Rafael Bautista', email: 'rafael.bautista@sfxc.edu', role: 'ENDORSER', passwordHash: hashPassword('password') } }),
    prisma.user.create({ data: { name: 'JMAPC Chair', email: 'jmapc@sfxc.edu', role: 'APPROVER_JMAPC', passwordHash: hashPassword('password') } }),
    prisma.user.create({ data: { name: 'JCA Chair', email: 'jca@sfxc.edu', role: 'APPROVER_JCA', passwordHash: hashPassword('password') } })
  ]);

  const [finance, academics, studentAffairs] = await Promise.all([
    prisma.department.create({ data: { name: 'Finance Office', headId: admin.id } }),
    prisma.department.create({ data: { name: 'Academic Affairs', headId: requestor.id } }),
    prisma.department.create({ data: { name: 'Student Affairs', headId: reviewer.id } })
  ]);

  const [schoolFund, specialFund, trustFund] = await Promise.all([
    prisma.fundSource.create({ data: { name: 'School Fund', description: 'General operating fund' } }),
    prisma.fundSource.create({ data: { name: 'Special Fund', description: 'Project-specific allocations' } }),
    prisma.fundSource.create({ data: { name: 'Trust Fund', description: 'Trust-designated budget' } })
  ]);

  const request1 = await prisma.activityRequest.create({
    data: {
      controlNumber: '20260611-SFXC-00001',
      date: new Date('2026-06-11T08:30:00Z'),
      departmentId: finance.id,
      requestedById: requestor.id,
      particulars: 'Field trip materials and transportation for Grade 10 environmental science outing.',
      preApprovalNotes: 'Request to secure funds before next board review.',
      amount: 12500.0,
      fundSourceId: schoolFund.id,
      status: 'FOR_FUND_AVAILABILITY',
      fundAvailable: null,
      reviewRemarks: null,
      endorsementRemarks: null,
      approvalRemarks: null
    }
  });

  await prisma.requestApproval.create({
    data: {
      requestId: request1.id,
      actorId: fundOfficer.id,
      role: 'FUND_OFFICER',
      action: 'CREATED',
      remarks: 'Initial request created and pending fund check.'
    }
  });

  await prisma.auditLog.create({
    data: {
      requestId: request1.id,
      userId: requestor.id,
      action: 'CREATE_REQUEST',
      details: 'Created initial activity request from sample seed data.'
    }
  });

  const request2 = await prisma.activityRequest.create({
    data: {
      controlNumber: '20260610-SFXC-00002',
      date: new Date('2026-06-10T09:15:00Z'),
      departmentId: academics.id,
      requestedById: requestor.id,
      particulars: 'Purchase library reference books and classroom resources.',
      amount: 8450.0,
      fundSourceId: specialFund.id,
      status: 'FOR_REVIEW',
      fundAvailable: true,
      fundAvailabilityRemarks: 'Verified funds available from special project budget.'
    }
  });

  await prisma.requestApproval.create({
    data: {
      requestId: request2.id,
      actorId: fundOfficer.id,
      role: 'FUND_OFFICER',
      action: 'FUND_AVAILABLE',
      remarks: 'School fund verified and cleared.'
    }
  });

  await prisma.auditLog.create({
    data: {
      requestId: request2.id,
      userId: fundOfficer.id,
      action: 'FUND_AVAILABLE',
      details: 'Fund availability confirmed by fund officer.'
    }
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
