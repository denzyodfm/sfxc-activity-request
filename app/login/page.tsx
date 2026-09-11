import LoginClient from '@/components/LoginClient';
import { getDemoAccountSettings } from '@/lib/demo-accounts';

// The demo panel is read from the database on every request, so switching it
// off in Admin Settings takes effect on the next page load rather than at the
// next build.
export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const { enabled, accounts } = await getDemoAccountSettings();

  // The credentials never reach the client component unless the panel is on;
  // switching it off removes them from the HTML, not just from view.
  return <LoginClient demoAccounts={enabled ? accounts : []} />;
}
