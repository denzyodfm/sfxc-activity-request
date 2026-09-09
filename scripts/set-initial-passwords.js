#!/usr/bin/env node
/**
 * Gives a real password to every account that has none.
 *
 * Accounts with a null passwordHash used to be signed into with the literal
 * string "password" — a backdoor into any such account, including the admin.
 * That fallback is gone, so those accounts now need actual credentials or
 * nobody can sign in to them.
 *
 * Each account gets its own random password. They are printed once and written
 * to initial-passwords.txt (gitignored); distribute them, have each person
 * change their password, then delete the file.
 *
 *   node scripts/set-initial-passwords.js [--dry]
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { hashPassword, generatePassword } = require('./lib/password');

const dryRun = process.argv.includes('--dry');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { passwordHash: null },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { email: 'asc' }
  });

  if (users.length === 0) {
    console.log('Nothing to do — every account already has a password.');
    return;
  }

  console.log(`${users.length} account(s) without a password:\n`);

  const issued = [];

  for (const user of users) {
    const password = generatePassword();
    issued.push({ ...user, password });

    if (!dryRun) {
      await prisma.user.update({
        where: { id: user.id },
        // Bumping tokenVersion drops any session that is still open on the
        // account from before it had a password.
        data: { passwordHash: hashPassword(password), tokenVersion: { increment: 1 } }
      });
    }
  }

  const width = Math.max(...issued.map((user) => user.email.length));

  for (const user of issued) {
    console.log(`  ${user.email.padEnd(width)}  ${user.password}   (${user.role})`);
  }

  if (dryRun) {
    console.log('\nDry run — no passwords were saved. Re-run without --dry to apply.');
    return;
  }

  const outputPath = path.join(__dirname, '..', 'initial-passwords.txt');
  const contents = [
    'SFXC Activity Request System — initial passwords',
    `Generated ${new Date().toISOString()}`,
    '',
    'Give each person their password, have them change it under Profile,',
    'then delete this file.',
    '',
    ...issued.map((user) => `${user.email.padEnd(width)}  ${user.password}   (${user.role})`),
    ''
  ].join('\n');

  fs.writeFileSync(outputPath, contents, { mode: 0o600 });

  console.log(`\nWritten to ${path.relative(process.cwd(), outputPath)} (gitignored).`);
  console.log('Distribute these, have everyone change their password, then delete the file.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
