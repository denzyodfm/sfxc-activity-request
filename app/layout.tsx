import './globals.css';
import AppShell from '@/components/AppShell';
import { SessionProvider } from '@/lib/session-context';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SFXC Activity Request System',
  description: 'Modern workflow and approval system for St. Francis Xavier College.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <div className="min-h-screen bg-slate-100 text-slate-900">
            <AppShell>{children}</AppShell>
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
