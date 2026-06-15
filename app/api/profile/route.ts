import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession, UserSession } from '@/lib/auth';
import { getSessionCookieOptions } from '@/lib/session-cookie';
import { hashPassword, verifyPassword } from '@/lib/password';
import { MAX_UPLOAD_SIZE_BYTES, MAX_UPLOAD_SIZE_LABEL } from '@/lib/upload-limits';

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

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters.' }, { status: 422 });
    }

    if (!verifyPassword(currentPassword, existingUser.passwordHash)) {
      return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
    }

    nextPasswordHash = hashPassword(newPassword);
  }

  let nextProfilePictureUrl = existingUser.profilePictureUrl;
  if (profilePicture && profilePicture.name) {
    if (!profilePicture.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Profile picture must be an image file.' }, { status: 422 });
    }

    if (profilePicture.size > MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json({ error: `Profile picture must not exceed ${MAX_UPLOAD_SIZE_LABEL}.` }, { status: 422 });
    }

    const safeName = path.basename(profilePicture.name.replace(/[^a-zA-Z0-9._-]/g, '_'));
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'profiles');
    await fs.mkdir(uploadDir, { recursive: true });
    const fileName = `${session.id}-${Date.now()}-${safeName}`;
    const targetPath = path.join(uploadDir, fileName);
    const fileData = await profilePicture.arrayBuffer();
    await fs.writeFile(targetPath, new Uint8Array(fileData));
    nextProfilePictureUrl = `/uploads/profiles/${fileName}`;
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

  const nextSession: UserSession = {
    id: updatedUser.id,
    name: updatedUser.name,
    email: updatedUser.email,
    role: updatedUser.role,
    departmentId: session.departmentId
  };

  const response = NextResponse.json({ user: updatedUser, message: 'Profile updated.' });
  response.cookies.set('session', JSON.stringify(nextSession), getSessionCookieOptions());

  return response;
}
