/**
 * Loads demo data for local development.
 *
 * This is destructive — it empties every workflow table before writing. It
 * refuses to run against a database that already holds requests or non-seed
 * accounts unless `--force` is passed, because `npm run db:seed` sits one
 * keystroke away from `npm run db:push` and the two are not equally safe.
 *
 * Branding (AppSetting) and voucher signatories are deliberately left alone;
 * they are configuration, not sample data.
 *
 *   node prisma/seed.js [--force]
 */

const { PrismaClient } = require('@prisma/client');
const { hashPassword, generatePassword } = require('../scripts/lib/password');

const prisma = new PrismaClient();
const force = process.argv.includes('--force');

const SEED_ACCOUNTS = [
  { name: 'System Admin', email: 'admin@sfxc.edu', role: 'ADMIN' },
  { name: 'Nina Reyes', email: 'nina.reyes@sfxc.edu', role: 'REQUESTOR' },
  { name: 'Marcos Dela Cruz', email: 'marcos.dc@sfxc.edu', role: 'FUND_OFFICER' },
  { name: 'Liza Santos', email: 'liza.santos@sfxc.edu', role: 'REVIEWER' },
  { name: 'Rafael Bautista', email: 'rafael.bautista@sfxc.edu', role: 'ENDORSER' },
  { name: 'JMAPC Chair', email: 'jmapc@sfxc.edu', role: 'APPROVER_JMAPC' },
  { name: 'JCA Chair', email: 'jca@sfxc.edu', role: 'APPROVER_JCA' }
];

/**
 * Refuses to wipe a database that looks like it is in real use, where "real
 * use" means any activity request at all, or any account the seed did not
 * create.
 */
async function guardAgainstRealData() {
  if (force) return;

  const [requestCount, foreignUserCount] = await Promise.all([
    prisma.activityRequest.count(),
    prisma.user.count({ where: { email: { notIn: SEED_ACCOUNTS.map((account) => account.email) } } })
  ]);

  if (requestCount === 0 && foreignUserCount === 0) return;

  const reasons = [];
  if (requestCount > 0) reasons.push(`${requestCount} activity request(s)`);
  if (foreignUserCount > 0) reasons.push(`${foreignUserCount} account(s) the seed did not create`);

  const error = new Error(
    `Refusing to seed: this database holds ${reasons.join(' and ')}.\n` +
      'Seeding deletes all of it. Take a backup (scripts/backup-local.sh) first,\n' +
      'then re-run with --force if you really do mean to wipe it:\n' +
      '  node prisma/seed.js --force'
  );
  error.expected = true;
  throw error;
}

async function main() {
  await guardAgainstRealData();

  // Order matters. FundLedgerEntry.fundSourceId is ON DELETE RESTRICT, so the
  // ledger has to go before the fund sources it points at. Omitting it made this
  // script fail outright on any database that had ever completed a voucher.
  await prisma.auditLog.deleteMany();
  await prisma.requestApproval.deleteMany();
  await prisma.requestAttachment.deleteMany();
  await prisma.fundLedgerEntry.deleteMany();
  await prisma.activityRequest.deleteMany();
  await prisma.fundSource.deleteMany();
  await prisma.department.deleteMany();
  await prisma.user.deleteMany();

  // Each account gets its own random password, printed once at the end. The old
  // seed gave every account the literal string 'password', hashed with a single
  // round of SHA-256 under one shared salt — so all seven hashes were identical
  // and precomputable, and the password itself is one validatePassword() now
  // rejects as too common.
  const credentials = [];

  const [admin, requestor, fundOfficer, reviewer, endorser, approverJMAPC, approverJCA] =
    await Promise.all(
      SEED_ACCOUNTS.map(({ name, email, role }) => {
        const password = generatePassword();
        credentials.push({ email, password, role });

        return prisma.user.create({
          data: { name, email, role, passwordHash: hashPassword(password) }
        });
      })
    );

  const [finance, academics, studentAffairs] = await Promise.all([
    prisma.department.create({ data: { name: 'Finance Office', headId: admin.id } }),
    prisma.department.create({ data: { name: 'Academic Affairs', headId: requestor.id } }),
    prisma.department.create({ data: { name: 'Student Affairs', headId: reviewer.id } })
  ]);

  await Promise.all([
    prisma.user.update({ where: { id: admin.id }, data: { departmentId: finance.id } }),
    prisma.user.update({ where: { id: requestor.id }, data: { departmentId: academics.id } }),
    prisma.user.update({ where: { id: fundOfficer.id }, data: { departmentId: finance.id } }),
    prisma.user.update({ where: { id: reviewer.id }, data: { departmentId: studentAffairs.id } }),
    prisma.user.update({ where: { id: endorser.id }, data: { departmentId: studentAffairs.id } }),
    prisma.user.update({ where: { id: approverJMAPC.id }, data: { departmentId: academics.id } }),
    prisma.user.update({ where: { id: approverJCA.id }, data: { departmentId: academics.id } })
  ]);

  const [schoolFund, specialFund] = await Promise.all([
    prisma.fundSource.create({ data: { name: 'School Fund', description: 'General operating fund' } }),
    prisma.fundSource.create({ data: { name: 'Special Fund', description: 'Project-specific allocations' } }),
    prisma.fundSource.create({ data: { name: 'Trust Fund', description: 'Trust-designated budget' } })
  ]);

  // Opening balances, so the demo funds can actually pay for the demo requests.
  // Without them the first voucher completion trips the overdraft guard in
  // spendFromFund() and the workflow cannot be walked end to end.
  await Promise.all(
    [
      { fund: schoolFund, amount: 500000 },
      { fund: specialFund, amount: 250000 }
    ].map(({ fund, amount }) =>
      prisma.fundLedgerEntry.create({
        data: {
          fundSourceId: fund.id,
          actorId: fundOfficer.id,
          type: 'DEPOSIT',
          description: 'Opening balance (seed data)',
          debit: amount,
          credit: 0,
          balanceAfter: amount
        }
      })
    )
  );

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

  const width = Math.max(...credentials.map((entry) => entry.email.length));

  console.log('\nSeeded 7 accounts. Their passwords are random and shown only here:\n');
  for (const entry of credentials) {
    console.log(`  ${entry.email.padEnd(width)}  ${entry.password}   (${entry.role})`);
  }
  console.log('\nChange them under Profile after first sign-in.\n');
}

main()
  .catch((error) => {
    // The guard's message is written to be read; anything unexpected needs its stack.
    console.error(error && error.expected ? `\n${error.message}\n` : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
