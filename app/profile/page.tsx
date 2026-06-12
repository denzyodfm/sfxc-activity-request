import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ProfileFormClient from '@/components/ProfileFormClient';

export default async function ProfilePage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      firstName: true,
      middleName: true,
      lastName: true,
      birthdate: true,
      position: true,
      profilePictureUrl: true
    }
  });

  if (!user) {
    redirect('/login');
  }

  return (
    <section className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Profile</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">My Profile</h1>
        <p className="mt-3 max-w-2xl text-slate-600">Update your personal information, profile picture, and password.</p>
      </div>
      <ProfileFormClient
        user={{
          ...user,
          birthdate: user.birthdate?.toISOString() ?? null
        }}
      />
    </section>
  );
}
