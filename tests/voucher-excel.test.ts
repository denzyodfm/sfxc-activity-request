import { describe, expect, it } from 'vitest';
import { buildVoucherExcelXml } from '@/lib/voucher-excel';

describe('buildVoucherExcelXml', () => {
  it('exports the complete disbursement voucher layout and escapes user text', () => {
    const xml = buildVoucherExcelXml({
      payee: 'Juan & Sons',
      address: 'Main <Campus>',
      voucherNumber: 'DV-001',
      date: '2026-09-15T00:00:00.000Z',
      particulars: 'Supplies & materials',
      amount: 1250.5,
      amountInWords: 'ONE THOUSAND TWO HUNDRED FIFTY PESOS ONLY',
      accountName: 'GENERAL FUND',
      fundName: 'OFFICE SUPPLIES',
      signatures: {
        prepared: { name: 'Fund Officer', title: 'Treasurer', approval: { approvalCode: 'ABC123', createdAt: '2026-09-15T01:00:00.000Z' } },
        checked: { name: 'Reviewer' },
        verified: { name: 'Endorser' },
        recommending: { name: 'JCA' },
        approved: { name: 'JMAPC' },
        president: { name: 'President' }
      }
    });

    expect(xml).toContain('ss:Name="Disbursement Voucher"');
    expect(xml).toContain('DISBURSEMENT VOUCHER');
    expect(xml).toContain('Accounts (For Accounting Use only)');
    expect(xml).toContain('RECOMMENDING APPROVAL:');
    expect(xml).toContain('Approval Code: ABC123');
    expect(xml).toContain('JUAN &amp; SONS');
    expect(xml).toContain('MAIN &lt;CAMPUS&gt;');
    expect(xml).toContain('ss:Type="Number">1250.5');
    expect(xml).toContain('<FitWidth>1</FitWidth>');
  });
});
