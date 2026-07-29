'use client';

import Link from 'next/link';
import { useSession } from '@/lib/session-context';
import LogoMark from './LogoMark';

function MenuIcon({ href }: { href: string }) {
  const iconClass = 'h-5 w-5 shrink-0';
  const common = {
    className: iconClass,
    fill: 'none',
    viewBox: '0 0 24 24',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    'aria-hidden': true
  };

  if (href === '/' || href.startsWith('/dashboard')) {
    return (
      <svg {...common}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13h8V3H3v10Zm10 8h8V11h-8v10ZM3 21h8v-6H3v6Zm10-12h8V3h-8v6Z" />
      </svg>
    );
  }

  if (href.startsWith('/profile')) {
    return (
      <svg {...common}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 7.5a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 21a7.5 7.5 0 0 1 15 0" />
      </svg>
    );
  }

  if (href.startsWith('/requests/new')) {
    return (
      <svg {...common}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      </svg>
    );
  }

  if (href.startsWith('/fund-availability') || href.startsWith('/funds')) {
    return (
      <svg {...common}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18v12H3V7Zm3-3h12v3H6V4Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 13h3m-6 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      </svg>
    );
  }

  if (href.startsWith('/reviewer')) {
    return (
      <svg {...common}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m4 13 4 4L20 5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10" />
      </svg>
    );
  }

  if (href.startsWith('/endorsement')) {
    return (
      <svg {...common}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 14.5V19h4.5L20 7.5 16.5 4 5 15.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="m14.5 6 3.5 3.5M3 21h18" />
      </svg>
    );
  }

  if (href.startsWith('/approval')) {
    return (
      <svg {...common}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 4.5 6v5.5c0 4.6 3.2 7.8 7.5 9.5 4.3-1.7 7.5-4.9 7.5-9.5V6L12 3Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="m8.5 12 2.2 2.2 4.8-5" />
      </svg>
    );
  }

  if (href.startsWith('/attachments')) {
    return (
      <svg {...common}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m8.5 12.5 6.8-6.8a3 3 0 1 1 4.2 4.2l-9.2 9.2a5 5 0 0 1-7.1-7.1l9-9" />
      </svg>
    );
  }

  if (href.startsWith('/for-voucher')) {
    return (
      <svg {...common}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3h14v18l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21V3Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 8h8m-8 4h8m-8 4h5" />
      </svg>
    );
  }

  if (href.startsWith('/done')) {
    return (
      <svg {...common}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h16v17H4V4Zm3-2h10v4H7V2Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="m8 14 2.5 2.5L16 10" />
      </svg>
    );
  }

  if (href.startsWith('/activity-logs')) {
    return (
      <svg {...common}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3h14v18H5V3Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 8h8M8 12h8M8 16h5" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </svg>
  );
}

const roleMenus: Record<string, Array<{ href: string; label: string }>> = {
  REQUESTOR: [
    { href: '/', label: 'Dashboard' },
    { href: '/profile', label: 'Profile' },
    { href: '/requests/new', label: 'Make Request' },
    { href: '/attachments', label: 'Attachments' },
    { href: '/done', label: 'Completed' }
  ],
  FUND_OFFICER: [
    { href: '/', label: 'Dashboard' },
    { href: '/profile', label: 'Profile' },
    { href: '/fund-availability', label: 'Fund Availability' },
    { href: '/funds', label: 'Source of Fund' },
    { href: '/for-voucher', label: 'For Voucher' },
    { href: '/done', label: 'Completed' }
  ],
  REVIEWER: [
    { href: '/', label: 'Dashboard' },
    { href: '/profile', label: 'Profile' },
    { href: '/reviewer', label: 'Reviewer' },
    { href: '/for-voucher', label: 'For Voucher' },
    { href: '/done', label: 'Completed' }
  ],
  ENDORSER: [
    { href: '/', label: 'Dashboard' },
    { href: '/profile', label: 'Profile' },
    { href: '/endorsement', label: 'Endorsed By' },
    { href: '/done', label: 'Completed' }
  ],
  APPROVER_JMAPC: [
    { href: '/', label: 'Dashboard' },
    { href: '/profile', label: 'Profile' },
    { href: '/approval?approver=APPROVER_JMAPC', label: 'Final Approval' },
    { href: '/done', label: 'Completed' }
  ],
  APPROVER_JCA: [
    { href: '/', label: 'Dashboard' },
    { href: '/profile', label: 'Profile' },
    { href: '/approval?approver=APPROVER_JCA', label: 'Final Approval' },
    { href: '/done', label: 'Completed' }
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
    { href: '/done', label: 'Completed' },
    { href: '/activity-logs', label: 'Activity Logs' },
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
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-sfxc-green"
              >
                <MenuIcon href={item.href} />
                <span>{item.label}</span>
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

