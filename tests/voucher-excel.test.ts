import { describe, expect, it } from 'vitest';
import { buildVoucherXlsx } from '@/lib/voucher-excel';
import { readStoredZip } from './xlsx-helpers';

describe('buildVoucherXlsx', () => {
  it('exports the complete disbursement voucher layout as an .xlsx and escapes user text', () => {
    const zip = buildVoucherXlsx({
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

    // A zip, not XML: this is what stops Excel's "format and extension don't match" warning.
    expect(Array.from(zip.subarray(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);

    const entries = readStoredZip(zip);
    const sheet = entries['xl/worksheets/sheet1.xml'].text;
    expect(entries['xl/workbook.xml'].text).toContain('name="Disbursement Voucher"');
    expect(sheet).toContain('DISBURSEMENT VOUCHER');
    expect(sheet).toContain('Accounts (For Accounting Use only)');
    expect(sheet).toContain('RECOMMENDING APPROVAL:');
    expect(sheet).toContain('Approval Code: ABC123');
    expect(sheet).toContain('JUAN &amp; SONS');
    expect(sheet).toContain('MAIN &lt;CAMPUS&gt;');
    expect(sheet).toContain('<v>1250.5</v>');
    expect(sheet).toContain('<pageSetUpPr fitToPage="1"/>');
    expect(sheet).toContain('fitToWidth="1" fitToHeight="1"');
  });

  it('keeps every row within the six voucher columns', () => {
    const zip = buildVoucherXlsx({
      payee: 'P', address: 'A', voucherNumber: 'V', date: '2026-09-15T00:00:00.000Z', particulars: 'X', amount: 1,
      amountInWords: 'ONE PESO ONLY', accountName: 'F', fundName: 'S',
      signatures: { prepared: {}, checked: {}, verified: {}, recommending: {}, approved: {}, president: {} }
    });
    const sheet = readStoredZip(zip)['xl/worksheets/sheet1.xml'].text;
    expect(sheet).not.toMatch(/r="G\d+"/);
    expect(sheet).toContain('<mergeCell ref="A1:F1"/>');
    expect(sheet).toContain('<mergeCell ref="B2:D2"/>');
  });
});
