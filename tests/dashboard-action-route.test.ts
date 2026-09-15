import { describe, expect, it } from 'vitest';
import { actionRoute } from '@/components/DashboardRequestBrowser';

describe('dashboard action cards', () => {
  it.each([
    ['FUND_OFFICER', 'FOR_FUND_AVAILABILITY', '/fund-availability'],
    ['REVIEWER', 'FOR_REVIEW', '/reviewer'],
    ['ENDORSER', 'FOR_ENDORSEMENT', '/endorsement'],
    ['APPROVER_JMAPC', 'FOR_APPROVAL', '/approval?approver=APPROVER_JMAPC'],
    ['APPROVER_JCA', 'FOR_APPROVAL', '/approval?approver=APPROVER_JCA']
  ])('routes %s to its work queue', (role, category, expected) => {
    expect(actionRoute(role, category)).toBe(expected);
  });

  it('keeps unrelated cards in reporting mode', () => {
    expect(actionRoute('REVIEWER', 'FOR_APPROVAL')).toBeNull();
    expect(actionRoute('REQUESTOR', 'FOR_REVIEW')).toBeNull();
  });
});
