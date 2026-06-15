'use client';

import Link from 'next/link';
import { useSession } from '@/lib/session-context';
import LogoMark from './LogoMark';

const roleMenus: Record<string, Array<{ href: string; label: string }>> = {
  REQUESTOR: [
    { href: '/', label: 'Dashboard' },
    { href: '/profile', label: 'Profile' },
    { href: '/requests/new', label: 'Make Request' },
    { href: '/attachments', label: 'Attachments' },
    { href: '/done', label: 'Done' }
  ],
  FUND_OFFICER: [
    { href: '/', label: 'Dashboard' },
    { href: '/profile', label: 'Profile' },
    { href: '/fund-availability', label: 'Fund Availability' },
    { href: '/done', label: 'Done' }
  ],
  REVIEWER: [
    { href: '/', label: 'Dashboard' },
    { href: '/profile', label: 'Profile' },
    { href: '/reviewer', label: 'Reviewer' },
    { href: '/for-voucher', label: 'For Voucher' },
    { href: '/done', label: 'Done' }
  ],
  ENDORSER: [
    { href: '/', label: 'Dashboard' },
    { href: '/profile', label: 'Profile' },
    { href: '/endorsement', label: 'Endorsed By' },
    { href: '/done', label: 'Done' }
  ],
  APPROVER_JMAPC: [
    { href: '/', label: 'Dashboard' },
    { href: '/profile', label: 'Profile' },
    { href: '/approval?approver=APPROVER_JMAPC', label: 'Final Approval' },
    { href: '/done', label: 'Done' }
  ],
  APPROVER_JCA: [
    { href: '/', label: 'Dashboard' },
    { href: '/profile', label: 'Profile' },
    { href: '/approval?approver=APPROVER_JCA', label: 'Final Approval' },
    { href: '/done', label: 'Done' }
  ],
  ADMIN: [
    { href: '/', label: 'Dashboard' },
    { href: '/profile', label: 'Profile' },
    { href: '/requests/new', label: 'Make Request' },
    { href: '/fund-availability', label: 'Fund Availability' },
    { href: '/reviewer', label: 'Reviewer' },
    { href: '/endorsement', label: 'Endorsed By' },
    { href: '/approval', label: 'Final Approval' },
    { href: '/attachments', label: 'Attachments' },
    { href: '/for-voucher', label: 'For Voucher' },
    { href: '/done', label: 'Done' },
    { href: '/admin', label: 'Admin Settings' }
  ]
};

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export default function Sidebar({ className = '', onNavigate }: SidebarProps) {
  const { user } = useSession();

  const menuItems = user ? (roleMenus[user.role] ?? []) : [];

  return (
    <aside className={`flex w-72 max-w-[85vw] flex-col gap-6 border-r border-slate-200/70 bg-white px-6 py-8 print:hidden xl:w-80 ${className}`}>
      <div className="space-y-3">
        <LogoMark size="sm" />
        <div>
          <p className="whitespace-nowrap text-sm uppercase tracking-[0.18em] text-slate-500">SFXC Activity Request</p>
        </div>
      </div>

      {user ? (
        <>
          <nav className="flex flex-col gap-2">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className="rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </>
      ) : (
        <div className="mt-auto">
          <Link href="/login" className="sfxc-button w-full text-center">
            Sign In
          </Link>
        </div>
      )}
    </aside>
  );
}

