'use client';

import { useState } from 'react';

interface ProfileFormClientProps {
  user: {
    firstName?: string | null;
    middleName?: string | null;
    lastName?: string | null;
    birthdate?: string | null;
    position?: string | null;
    profilePictureUrl?: string | null;
  };
}

export default function ProfileFormClient({ user }: ProfileFormClientProps) {
  const [firstName, setFirstName] = useState(user.firstName ?? '');
  const [middleName, setMiddleName] = useState(user.middleName ?? '');
  const [lastName, setLastName] = useState(user.lastName ?? '');
  const [birthdate, setBirthdate] = useState(user.birthdate ? user.birthdate.slice(0, 10) : '');
  const [position, setPosition] = useState(user.position ?? '');
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('saving');
    setMessage('');

    const formData = new FormData();
    formData.set('firstName', firstName);
    formData.set('middleName', middleName);
    formData.set('lastName', lastName);
    formData.set('birthdate', birthdate);
    formData.set('position', position);
    formData.set('currentPassword', currentPassword);
    formData.set('newPassword', newPassword);
    formData.set('confirmPassword', confirmPassword);
    if (profilePicture) {
      formData.set('profilePicture', profilePicture);
    }

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        body: formData
      });
      const data = await response.json();

      if (!response.ok) {
        setStatus('error');
        setMessage(data.error || 'Unable to update profile.');
        return;
      }

      setStatus('success');
      setMessage('Profile updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      setStatus('error');
      setMessage('Profile service unavailable.');
    }
  };

  return (
    <form className="sfxc-card space-y-6 p-6" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="h-24 w-24 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
          {user.profilePictureUrl ? (
            <img src={user.profilePictureUrl} alt="Profile" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <label className="block text-sm text-slate-700">
          Profile Picture
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setProfilePicture(event.target.files?.[0] ?? null)}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none file:mr-4 file:rounded-full file:border-0 file:bg-sfxc-green file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white focus:border-sfxc-green"
          />
          <span className="mt-1 block text-xs text-slate-500">Image only, maximum 2MB.</span>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="block text-sm text-slate-700">
          First Name
          <input value={firstName} onChange={(event) => setFirstName(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sfxc-green" />
        </label>
        <label className="block text-sm text-slate-700">
          Middle Name
          <input value={middleName} onChange={(event) => setMiddleName(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sfxc-green" />
        </label>
        <label className="block text-sm text-slate-700">
          Last Name
          <input value={lastName} onChange={(event) => setLastName(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sfxc-green" />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm text-slate-700">
          Birthdate
          <input type="date" value={birthdate} onChange={(event) => setBirthdate(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sfxc-green" />
        </label>
        <label className="block text-sm text-slate-700">
          Position
          <input value={position} onChange={(event) => setPosition(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sfxc-green" />
        </label>
      </div>

      <div className="rounded-3xl border border-slate-200 p-4">
        <h2 className="text-lg font-semibold text-slate-900">Change Password</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="block text-sm text-slate-700">
            Current Password
            <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sfxc-green" />
          </label>
          <label className="block text-sm text-slate-700">
            New Password
            <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sfxc-green" />
          </label>
          <label className="block text-sm text-slate-700">
            Confirm Password
            <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sfxc-green" />
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">Leave password fields blank to keep your current password.</p>
        <button type="submit" disabled={status === 'saving'} className="sfxc-button">
          {status === 'saving' ? 'Saving...' : 'Save Profile'}
        </button>
      </div>

      {status !== 'idle' ? (
        <div className={`rounded-3xl border px-4 py-3 text-sm ${status === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
          {message}
        </div>
      ) : null}
    </form>
  );
}
