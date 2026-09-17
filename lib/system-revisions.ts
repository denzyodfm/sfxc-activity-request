import { execFileSync, spawn } from 'child_process';
import path from 'path';
import prisma from '@/lib/prisma';

const REVISION_ACTIONS = new Set([
  'USER_CREATED', 'USER_UPDATED', 'USER_DEACTIVATED', 'USER_DELETED',
  'DEPARTMENT_CREATED', 'DEPARTMENT_UPDATED', 'DEPARTMENT_DELETED',
  'FUND_SOURCE_CREATED', 'FUND_SOURCE_UPDATED', 'FUND_SOURCE_DELETED',
  'VOUCHER_SIGNATORIES_UPDATED', 'BRANDING_UPDATED', 'DEMO_ACCOUNTS_UPDATED', 'DEMO_ACCOUNTS_TOGGLED'
]);

function currentCommit() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: process.cwd(), encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

async function configurationSnapshot() {
  const [users, departments, fundSources, voucherSignatories, appSettings] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true, name: true, email: true, passwordHash: true, firstName: true, middleName: true,
        lastName: true, birthdate: true, position: true, profilePictureUrl: true, role: true,
        isDepartmentHead: true, isActive: true, tokenVersion: true, failedLoginCount: true,
        lockedUntil: true, departmentId: true
      }
    }),
    prisma.department.findMany({ select: { id: true, name: true, headId: true } }),
    prisma.fundSource.findMany({ select: { id: true, name: true, description: true, parentId: true } }),
    prisma.voucherSignatory.findMany({ select: { id: true, slot: true, name: true, title: true } }),
    prisma.appSetting.findMany({ select: { key: true, value: true } })
  ]);
  return { version: 1, users, departments, fundSources, voucherSignatories, appSettings };
}

export async function saveSystemRevision(label: string, actor?: { id: string; name: string } | null) {
  const snapshot = await configurationSnapshot();
  return prisma.systemRevision.create({
    data: {
      label: label.slice(0, 191),
      snapshot: JSON.stringify(snapshot),
      codeCommit: currentCommit(),
      createdById: actor?.id,
      createdByName: actor?.name
    }
  });
}

export async function ensureBaselineRevision(actor: { id: string; name: string }) {
  if (await prisma.systemRevision.count()) return;
  await saveSystemRevision('Initial settings baseline', actor);
}

export async function saveRevisionForAdminAction(action: string, details: string | null | undefined, userId?: string | null) {
  if (!REVISION_ACTIONS.has(action)) return;
  const actor = userId
    ? await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true } })
    : null;
  await saveSystemRevision(details || action.replace(/_/g, ' '), actor);
}

type Snapshot = Awaited<ReturnType<typeof configurationSnapshot>>;

export async function restoreSystemRevision(revisionId: string, actor: { id: string; name: string }) {
  const revision = await prisma.systemRevision.findUnique({ where: { id: revisionId } });
  if (!revision) throw new Error('Revision not found.');
  const snapshot = JSON.parse(revision.snapshot) as Snapshot;
  if (snapshot.version !== 1) throw new Error('This revision format is not supported.');

  await saveSystemRevision(`Safety backup before restoring: ${revision.label}`, actor);

  await prisma.$transaction(async (tx) => {
    const departmentIds = snapshot.departments.map((item) => item.id);
    const userIds = snapshot.users.map((item) => item.id);
    const fundIds = snapshot.fundSources.map((item) => item.id);

    await tx.department.updateMany({ data: { headId: null } });

    for (const item of snapshot.departments) {
      await tx.department.upsert({
        where: { id: item.id },
        create: { id: item.id, name: item.name },
        update: { name: item.name, headId: null }
      });
    }
    for (const item of snapshot.fundSources) {
      await tx.fundSource.upsert({
        where: { id: item.id },
        create: { id: item.id, name: item.name, description: item.description },
        update: { name: item.name, description: item.description, parentId: null }
      });
    }
    for (const item of snapshot.users) {
      await tx.user.upsert({
        where: { id: item.id },
        create: { ...item, birthdate: item.birthdate ? new Date(item.birthdate) : null, lockedUntil: item.lockedUntil ? new Date(item.lockedUntil) : null },
        update: { ...item, birthdate: item.birthdate ? new Date(item.birthdate) : null, lockedUntil: item.lockedUntil ? new Date(item.lockedUntil) : null, tokenVersion: { increment: 1 } }
      });
    }
    for (const item of snapshot.departments) {
      await tx.department.update({ where: { id: item.id }, data: { headId: item.headId } });
    }
    for (const item of snapshot.fundSources) {
      await tx.fundSource.update({ where: { id: item.id }, data: { parentId: item.parentId } });
    }

    await tx.voucherSignatory.deleteMany({ where: { id: { notIn: snapshot.voucherSignatories.map((item) => item.id) } } });
    for (const item of snapshot.voucherSignatories) {
      await tx.voucherSignatory.upsert({ where: { id: item.id }, create: item, update: item });
    }
    await tx.appSetting.deleteMany({ where: { key: { notIn: snapshot.appSettings.map((item) => item.key) } } });
    for (const item of snapshot.appSettings) {
      await tx.appSetting.upsert({ where: { key: item.key }, create: item, update: { value: item.value } });
    }

    // Remove entities created after the revision only when no business history
    // references them. Otherwise abort the whole rollback instead of damaging records.
    const extraUsers = await tx.user.findMany({ where: { id: { notIn: userIds } }, include: { _count: { select: { requests: true, approvedRequests: true, approvals: true, auditLogs: true, fundLedgerEntries: true } } } });
    if (extraUsers.some((item) => Object.values(item._count).some(Boolean))) throw new Error('A newer user already has activity and prevents this rollback.');
    await tx.user.deleteMany({ where: { id: { notIn: userIds }, NOT: { id: actor.id } } });

    const extraDepartments = await tx.department.findMany({ where: { id: { notIn: departmentIds } }, include: { _count: { select: { requests: true, employees: true } } } });
    if (extraDepartments.some((item) => item._count.requests || item._count.employees)) throw new Error('A newer department is already in use and prevents this rollback.');
    await tx.department.deleteMany({ where: { id: { notIn: departmentIds } } });

    const extraFunds = await tx.fundSource.findMany({ where: { id: { notIn: fundIds } }, include: { _count: { select: { requests: true, ledgerEntries: true } } } });
    if (extraFunds.some((item) => item._count.requests || item._count.ledgerEntries)) throw new Error('A newer fund account is already in use and prevents this rollback.');
    await tx.fundSource.deleteMany({ where: { id: { notIn: fundIds }, parentId: { not: null } } });
    await tx.fundSource.deleteMany({ where: { id: { notIn: fundIds } } });

    await tx.systemRevision.update({ where: { id: revision.id }, data: { restoredAt: new Date() } });
  });

  await saveSystemRevision(`Restored settings revision: ${revision.label}`, actor);
}

export function listCodeReleases() {
  const output = execFileSync('git', ['log', '--first-parent', '-20', '--pretty=format:%H%x09%h%x09%aI%x09%s'], {
    cwd: process.cwd(), encoding: 'utf8'
  });
  return output.split('\n').filter(Boolean).map((line) => {
    const [commit, shortCommit, date, ...subject] = line.split('\t');
    return { commit, shortCommit, date, subject: subject.join('\t') };
  });
}

export function startCodeRollback(commit: string) {
  if (!/^[a-f0-9]{40}$/i.test(commit)) throw new Error('Invalid release commit.');
  execFileSync('git', ['merge-base', '--is-ancestor', commit, 'HEAD'], { cwd: process.cwd() });
  const script = path.join(process.cwd(), 'scripts', 'rollback-release.sh');
  const child = spawn('bash', [script, commit], { cwd: process.cwd(), detached: true, stdio: 'ignore' });
  child.unref();
}
