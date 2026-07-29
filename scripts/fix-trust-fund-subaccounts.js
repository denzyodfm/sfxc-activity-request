const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const accounts = await prisma.fundSource.findMany();
  const normalize = (value) => value.replace(/\p{Cf}/gu, '').trim().toLowerCase();
  const trustFund = accounts.find((account) => normalize(account.name) === 'trust fund');
  if (!trustFund) throw new Error('Trust Fund main account was not found.');

  const targetNames = new Set(['test', 'ccje', 'ccje department fee']);
  const targets = accounts.filter((account) => targetNames.has(normalize(account.name)));
  await prisma.$transaction(
    targets.map((account) =>
      prisma.fundSource.update({
        where: { id: account.id },
        data: { name: account.name.replace(/\p{Cf}/gu, '').trim(), parentId: trustFund.id }
      })
    )
  );

  console.log(`Updated ${targets.length} account(s).`);
  targets.forEach((account) => console.log(`${JSON.stringify(account.name)} -> ${trustFund.name}`));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
