import { describe, expect, it } from 'vitest';
import { actionRoute, finalApproverLabel } from '@/components/DashboardRequestBrowser';

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

describe('final approver label', () => {
  it('names the approver the request was endorsed to', () => {
    expect(finalApproverLabel('APPROVER_JMAPC')).toBe('JMAPC');
    expect(finalApproverLabel('APPROVER_JCA')).toBe('JCA');
  });

  it('stays empty before endorsement or for an unknown value', () => {
    expect(finalApproverLabel(null)).toBeNull();
    expect(finalApproverLabel(undefined)).toBeNull();
    expect(finalApproverLabel('ADMIN')).toBeNull();
  });
});
