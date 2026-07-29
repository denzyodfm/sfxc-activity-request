const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const trustFund = await prisma.fundSource.findUnique({ where: { name: 'Trust Fund' } });
  if (!trustFund) throw new Error('Trust Fund main account was not found.');

  const names = ['Test', 'CCJE Department Fee'];
  const result = await prisma.fundSource.updateMany({
    where: { name: { in: names } },
    data: { parentId: trustFund.id }
  });
  const accounts = await prisma.fundSource.findMany({
    where: { name: { in: names } },
    include: { parent: { select: { name: true } } },
    orderBy: { name: 'asc' }
  });

  console.log(`Updated ${result.count} account(s).`);
  accounts.forEach((account) => console.log(`${account.name} -> ${account.parent?.name ?? 'No main account'}`));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
