import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { SESSION_COOKIE_NAME, getSessionCookieOptions } from '@/lib/session-cookie';
import { createSessionToken } from '@/lib/session-token';
import { hashPassword, verifyPassword, validatePassword } from '@/lib/password';
import { saveUpload, validateUpload, PROFILE_SUBDIR } from '@/lib/uploads';
import { MAX_UPLOAD_SIZE_BYTES, MAX_UPLOAD_SIZE_LABEL } from '@/lib/upload-limits';
import { recordActivity } from '@/lib/activity-log';

function buildName(firstName: string, middleName: string, lastName: string, fallback: string) {
  const fullName = [firstName, middleName, lastName].map((part) => part.trim()).filter(Boolean).join(' ');
  return fullName || fallback;
}

export async function PUT(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const existingUser = await prisma.user.findUnique({ where: { id: session.id } });
  if (!existingUser) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  const formData = await request.formData();
  const firstName = formData.get('firstName')?.toString() ?? '';
  const middleName = formData.get('middleName')?.toString() ?? '';
  const lastName = formData.get('lastName')?.toString() ?? '';
  const birthdateValue = formData.get('birthdate')?.toString() ?? '';
  const position = formData.get('position')?.toString() ?? '';
  const currentPassword = formData.get('currentPassword')?.toString() ?? '';
  const newPassword = formData.get('newPassword')?.toString() ?? '';
  const confirmPassword = formData.get('confirmPassword')?.toString() ?? '';
  const profilePicture = formData.get('profilePicture') as File | null;

  let nextPasswordHash = existingUser.passwordHash;
  if (newPassword || confirmPassword || currentPassword) {
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: 'Current password, new password, and confirmation are required to change password.' }, { status: 422 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'New password and confirmation do not match.' }, { status: 422 });
    }

    const policyError = validatePassword(newPassword);
    if (policyError) {
      return NextResponse.json({ error: policyError }, { status: 422 });
    }

    if (!verifyPassword(currentPassword, existingUser.passwordHash)) {
      return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
    }

    nextPasswordHash = hashPassword(newPassword);
  }

  let nextProfilePictureUrl = existingUser.profilePictureUrl;
  if (profilePicture && profilePicture.name) {
    if (profilePicture.size > MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json({ error: `Profile picture must not exceed ${MAX_UPLOAD_SIZE_LABEL}.` }, { status: 422 });
    }

    const bytes = new Uint8Array(await profilePicture.arrayBuffer());
    const extension = path.extname(profilePicture.name).toLowerCase();
    const uploadError = validateUpload(extension, profilePicture.type, bytes, { imagesOnly: true });

    if (uploadError) {
      return NextResponse.json({ error: `Profile picture: ${uploadError}` }, { status: 422 });
    }

    const saved = await saveUpload(bytes, profilePicture.name, {
      subdir: PROFILE_SUBDIR,
      prefix: session.id
    });
    nextProfilePictureUrl = saved.storageKey;
  }

  const updatedUser = await prisma.user.update({
    where: { id: session.id },
    data: {
      name: buildName(firstName, middleName, lastName, existingUser.name),
      firstName: firstName || null,
      middleName: middleName || null,
      lastName: lastName || null,
      birthdate: birthdateValue ? new Date(birthdateValue) : null,
      position: position || null,
      profilePictureUrl: nextProfilePictureUrl,
      passwordHash: nextPasswordHash
    }
  });

  await recordActivity({
    userId: session.id,
    action: 'PROFILE_UPDATED',
    details: newPassword ? 'Updated profile information and password.' : 'Updated profile information.'
  });

  const response = NextResponse.json({
    user: {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      firstName: updatedUser.firstName,
      middleName: updatedUser.middleName,
      lastName: updatedUser.lastName,
      birthdate: updatedUser.birthdate,
      position: updatedUser.position,
      profilePictureUrl: updatedUser.profilePictureUrl
    },
    message: 'Profile updated.'
  });

  // Issue a fresh token so that a password change rotates the session. The
  // token must carry the current tokenVersion or getSession() will reject it.
  response.cookies.set(
    SESSION_COOKIE_NAME,
    createSessionToken(session.id, updatedUser.tokenVersion),
    getSessionCookieOptions()
  );

  return response;
}
