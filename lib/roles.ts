/**
 * Every role the workflow recognises.
 *
 * The role column is a plain string, so without this list a typo — or a crafted
 * request — could store a role that no page grants access to, silently locking
 * the account out of everything.
 */
export const ALLOWED_ROLES = [
  'ADMIN',
  'REQUESTOR',
  'FUND_OFFICER',
  'REVIEWER',
  'ENDORSER',
  'APPROVER_JMAPC',
  'APPROVER_JCA'
] as const;

export type Role = (typeof ALLOWED_ROLES)[number];

export function isValidRole(role: string): role is Role {
  return (ALLOWED_ROLES as readonly string[]).includes(role);
}
