import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { recordActivity } from '@/lib/activity-log';
import { hashPassword, validatePassword } from '@/lib/password';
import { isValidRole } from '@/lib/roles';

interface UserRouteProps {
  params: { id: string };
}

export async function PUT(request: NextRequest, { params }: UserRouteProps) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const body = await request.json();
  const { name, role, departmentId, isDepartmentHead, isActive, newPassword } = body;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

  if (!name || !email || !role) {
    return NextResponse.json({ error: 'Name, email, and role are required.' }, { status: 422 });
  }

  if (!isValidRole(role)) {
    return NextResponse.json({ error: 'That is not a valid role.' }, { status: 422 });
  }

  const existingUser = await prisma.user.findUnique({
    where: { id: params.id },
    include: { headedDepartment: true }
  });
  if (!existingUser) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  // An admin editing their own account must not be able to remove their own
  // access — that can leave the system with no way back in.
  const isSelf = existingUser.id === session.id;

  if (isSelf && role !== 'ADMIN') {
    return NextResponse.json({ error: 'You cannot change your own role away from Admin.' }, { status: 400 });
  }

  if (isSelf && isActive === false) {
    return NextResponse.json({ error: 'You cannot deactivate your own account.' }, { status: 400 });
  }

  // Likewise, the last active admin must stay active and stay an admin.
  if (existingUser.role === 'ADMIN' && (role !== 'ADMIN' || isActive === false)) {
    const otherActiveAdmins = await prisma.user.count({
      where: { role: 'ADMIN', isActive: true, NOT: { id: params.id } }
    });

    if (otherActiveAdmins === 0) {
      return NextResponse.json(
        { error: 'This is the last active admin account. Promote another admin first.' },
        { status: 400 }
      );
    }
  }

  const emailOwner = await prisma.user.findUnique({ where: { email } });
  if (emailOwner && emailOwner.id !== params.id) {
    return NextResponse.json({ error: 'Another user already uses this email.' }, { status: 400 });
  }

  if (departmentId) {
    const department = await prisma.department.findUnique({ where: { id: departmentId } });

    if (!department) {
      return NextResponse.json({ error: 'Department not found.' }, { status: 404 });
    }
  }

  // Only an actual demotion is blocked — the user is currently flagged as head,
  // still heads a department, and the flag is being unchecked. Firing whenever
  // the flag is merely false made every edit to such a user impossible when the
  // flag and the department's headId had already drifted apart, which also
  // prevented the account from being deactivated.
  if (existingUser.isDepartmentHead && !Boolean(isDepartmentHead) && existingUser.headedDepartment) {
    return NextResponse.json(
      {
        error: `Remove this user as head of ${existingUser.headedDepartment.name} before unchecking department head.`
      },
      { status: 400 }
    );
  }

  let passwordHash: string | undefined;

  if (newPassword) {
    const policyError = validatePassword(newPassword);
    if (policyError) {
      return NextResponse.json({ error: policyError }, { status: 422 });
    }

    passwordHash = hashPassword(newPassword);
  }

  const nextIsActive = isActive === undefined ? existingUser.isActive : Boolean(isActive);
  const deactivating = existingUser.isActive && !nextIsActive;

  // Any of these must not leave the user's existing sessions usable: an
  // admin-set password implies the old one is compromised, a role change alters
  // what they may do, and a deactivation must take effect at once. Bumping
  // tokenVersion invalidates every token already issued to them.
  const shouldRevokeSessions =
    Boolean(passwordHash) || deactivating || existingUser.role !== role;

  const updatedUser = await prisma.user.update({
    where: { id: params.id },
    data: {
      name,
      email,
      role,
      isDepartmentHead: Boolean(isDepartmentHead),
      departmentId: departmentId || null,
      isActive: nextIsActive,
      ...(passwordHash ? { passwordHash } : {}),
      ...(shouldRevokeSessions ? { tokenVersion: { increment: 1 } } : {}),
      // Reactivating clears any standing lockout so the user is not still
      // blocked by a counter from before.
      ...(nextIsActive && !existingUser.isActive ? { failedLoginCount: 0, lockedUntil: null } : {})
    }
  });

  const changes = [
    `role: ${updatedUser.role}`,
    existingUser.isActive !== nextIsActive ? (nextIsActive ? 'reactivated' : 'deactivated') : null,
    passwordHash ? 'password reset by admin' : null,
    shouldRevokeSessions ? 'active sessions revoked' : null
  ].filter(Boolean);

  await recordActivity({
    userId: session.id,
    action: nextIsActive ? 'USER_UPDATED' : 'USER_DEACTIVATED',
    details: `Updated user ${updatedUser.name} (${updatedUser.email}); ${changes.join('; ')}.`
  });

  return NextResponse.json({ user: { ...updatedUser, passwordHash: undefined } });
}

export async function DELETE(_request: NextRequest, { params }: UserRouteProps) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  if (params.id === session.id) {
    return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      _count: {
        select: {
          requests: true,
          approvedRequests: true,
          approvals: true,
          auditLogs: true,
          fundLedgerEntries: true
        }
      }
    }
  });

  if (!existingUser) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  const isUsed =
    existingUser._count.requests > 0 ||
    existingUser._count.approvedRequests > 0 ||
    existingUser._count.approvals > 0 ||
    existingUser._count.auditLogs > 0 ||
    existingUser._count.fundLedgerEntries > 0;

  // Deleting a user with history would destroy the audit trail, so it stays
  // blocked. Deactivation is the supported way to revoke access for someone who
  // has used the system.
  if (isUsed) {
    return NextResponse.json(
      {
        error:
          'This user appears in request records and cannot be deleted. Deactivate the account instead — that blocks sign-in and ends their sessions while keeping the audit trail intact.'
      },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.department.updateMany({
      where: { headId: params.id },
      data: { headId: null }
    });

    await tx.user.delete({ where: { id: params.id } });
  });

  await recordActivity({
    userId: session.id,
    action: 'USER_DELETED',
    details: `Deleted user ${existingUser.name} (${existingUser.email}).`
  });

  return NextResponse.json({ message: 'User deleted.' });
}
