const { PrismaClient } = require('@prisma/client');
const { createHash } = require('crypto');

const prisma = new PrismaClient();
const collegeLetters = 'SaintFrancisXavierCollege'.replace(/[^A-Za-z]/g, '');
const uppercaseLetters = collegeLetters.toUpperCase();
const lowercaseLetters = collegeLetters.toLowerCase();
const digits = '123456789';

function pick(source, value) {
  return source[value % source.length];
}

function generateApprovalCode(record) {
  const seed = [
    collegeLetters,
    record.requestId,
    record.actorId,
    record.role,
    record.action,
    record.createdAt.toISOString()
  ].join('|');
  const digest = createHash('sha256').update(seed).digest();
  const alphabet = `${uppercaseLetters}${lowercaseLetters}${digits}`;
  const code = [
    pick(uppercaseLetters, digest[0]),
    pick(lowercaseLetters, digest[1]),
    pick(digits, digest[2])
  ];

  for (let index = code.length; index < 10; index += 1) {
    code.push(pick(alphabet, digest[index]));
  }

  for (let index = code.length - 1; index > 0; index -= 1) {
    const swapIndex = digest[index + 10] % (index + 1);
    [code[index], code[swapIndex]] = [code[swapIndex], code[index]];
  }

  return code.join('');
}

async function main() {
  const records = await prisma.requestApproval.findMany({
    where: { approvalCode: null },
    orderBy: { createdAt: 'asc' }
  });

  for (const record of records) {
    await prisma.requestApproval.update({
      where: { id: record.id },
      data: { approvalCode: generateApprovalCode(record) }
    });
  }

  console.log(`Backfilled ${records.length} approval code(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
