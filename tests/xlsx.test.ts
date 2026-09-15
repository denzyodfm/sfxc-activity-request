import { describe, expect, it } from 'vitest';
import { buildXlsx, columnName, crc32, escapeXml } from '@/lib/xlsx';
import { readStoredZip } from './xlsx-helpers';

describe('xlsx helpers', () => {
  it('computes the standard CRC-32 check value', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });

  it('names columns the way Excel does', () => {
    expect(columnName(0)).toBe('A');
    expect(columnName(25)).toBe('Z');
    expect(columnName(26)).toBe('AA');
    expect(columnName(701)).toBe('ZZ');
  });

  it('escapes markup and drops control characters Excel rejects', () => {
    expect(escapeXml('a & <b> "c" \'d\'\tline\nnext')).toBe('a &amp; &lt;b&gt; &quot;c&quot; &apos;d&apos;\tline\nnext');
  });
});

describe('buildXlsx', () => {
  const zip = buildXlsx({
    name: 'Logs: [2026]',
    columns: [20, 30],
    styles: { Header: { font: { bold: true, color: 'FFFFFF' }, fill: '065F46' }, Date: { numberFormat: 'm/d/yyyy' } },
    rows: [
      { cells: [{ value: 'When', style: 'Header' }, { value: 'What', style: 'Header' }] },
      { height: 30, cells: [{ value: new Date(Date.UTC(2026, 8, 15)), style: 'Date' }, { value: 42.5 }] }
    ],
    frozenRows: 1,
    autoFilter: 'A1:B2'
  });
  const entries = readStoredZip(zip);

  it('packages every part an .xlsx needs, with correct checksums', () => {
    expect(Object.keys(entries).sort()).toEqual([
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/_rels/workbook.xml.rels',
      'xl/styles.xml',
      'xl/workbook.xml',
      'xl/worksheets/sheet1.xml'
    ]);
    for (const entry of Object.values(entries)) {
      expect(crc32(new TextEncoder().encode(entry.text))).toBe(entry.crc);
    }
  });

  it('writes typed cells, dates as serial numbers, and sheet options', () => {
    const sheet = entries['xl/worksheets/sheet1.xml'].text;
    expect(sheet).toContain('<c r="A1" s="1" t="inlineStr"><is><t xml:space="preserve">When</t></is></c>');
    expect(sheet).toContain('<c r="A2" s="2"><v>46280</v></c>');
    expect(sheet).toContain('<c r="B2"><v>42.5</v></c>');
    expect(sheet).toContain('<row r="2" ht="30" customHeight="1">');
    expect(sheet).toContain('state="frozen"');
    expect(sheet).toContain('<autoFilter ref="A1:B2"/>');
  });

  it('keeps the sheet name within Excel rules', () => {
    expect(entries['xl/workbook.xml'].text).toContain('<sheet name="Logs   2026 " sheetId="1"');
    expect(entries['xl/styles.xml'].text).toContain('<numFmt numFmtId="164" formatCode="m/d/yyyy"/>');
  });
});
