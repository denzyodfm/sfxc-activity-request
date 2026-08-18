import './globals.css';
import AppShell from '@/components/AppShell';
import { SessionProvider } from '@/lib/session-context';
import { getBranding } from '@/lib/branding';
import type { Metadata } from 'next';

// The layout reads branding from the database, so pages must not be baked at
// build time — otherwise an admin's change would not reach a prerendered page
// until the next build.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'SFXC Activity Request System',
  description: 'Modern workflow and approval system for St. Francis Xavier College.'
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const branding = await getBranding();

  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <div className="min-h-screen bg-slate-100 text-slate-900">
            <AppShell branding={branding}>{children}</AppShell>
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
