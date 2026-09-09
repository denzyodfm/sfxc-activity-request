import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';
import { csvDate, csvResponse, toCsv } from '@/lib/csv';

const BOM = '﻿';

/** The rows of a CSV body, with the BOM and the trailing newline removed. */
function lines(csv: string) {
  expect(csv.startsWith(BOM)).toBe(true);
  expect(csv.endsWith('\r\n')).toBe(true);
  return csv.slice(BOM.length, -2).split('\r\n');
}

describe('toCsv', () => {
  it('writes a header row and one row per record', () => {
    expect(lines(toCsv(['a', 'b'], [[1, 2], [3, 4]]))).toEqual(['a,b', '1,2', '3,4']);
  });

  it('writes just the header when there are no rows', () => {
    expect(lines(toCsv(['a', 'b'], []))).toEqual(['a,b']);
  });

  it('starts with a BOM so Excel reads UTF-8 correctly', () => {
    expect(toCsv(['Amount'], [['x']]).charCodeAt(0)).toBe(0xfeff);
  });

  it('uses CRLF line endings', () => {
    expect(toCsv(['a'], [['b']])).toBe(`${BOM}a\r\nb\r\n`);
  });

  it('renders null and undefined as empty cells', () => {
    expect(lines(toCsv(['a', 'b', 'c'], [[null, undefined, '']]))).toEqual(['a,b,c', ',,']);
  });

  it('renders a Date as an ISO timestamp', () => {
    const csv = toCsv(['when'], [[new Date('2026-06-11T08:30:00.000Z')]]);
    expect(lines(csv)[1]).toBe('2026-06-11T08:30:00.000Z');
  });

  it('quotes cells containing a comma, quote, or newline', () => {
    expect(lines(toCsv(['a'], [['x,y']]))[1]).toBe('"x,y"');
    expect(lines(toCsv(['a'], [['say "hi"']]))[1]).toBe('"say ""hi"""');
    expect(toCsv(['a'], [['line1\nline2']])).toContain('"line1\nline2"');
  });

  it('leaves ordinary cells unquoted', () => {
    expect(lines(toCsv(['a'], [['plain text']]))[1]).toBe('plain text');
  });

  // The reason the prefixing exists: a particulars field typed by a requestor
  // ends up in a spreadsheet on someone else's desktop.
  describe('formula injection', () => {
    it('neutralises every prefix a spreadsheet would execute', () => {
      for (const dangerous of [
        '=1+1',
        '+1',
        '-1',
        '@SUM(A1)',
        '=cmd|\' /c calc\'!A1',
        '\tleading tab',
        '\rleading cr'
      ]) {
        const cell = lines(toCsv(['a'], [[dangerous]]))[1];
        const unquoted = cell.startsWith('"') ? cell.slice(1, -1).replace(/""/g, '"') : cell;
        expect(unquoted.startsWith("'")).toBe(true);
        expect(unquoted.slice(1)).toBe(dangerous);
      }
    });

    it('leaves a negative number in a text field prefixed, not reinterpreted', () => {
      // -500 is prefixed like any other leading dash. Amount columns are
      // written as positive figures, so this costs nothing.
      expect(lines(toCsv(['a'], [['-500']]))[1]).toBe("'-500");
    });

    it('does not touch text that merely contains an operator', () => {
      expect(lines(toCsv(['a'], [['2 + 2 = 4']]))[1]).toBe('2 + 2 = 4');
    });

    it('applies to header cells too', () => {
      expect(lines(toCsv(['=BAD()'], []))[0]).toBe("'=BAD()");
    });
  });
});

describe('csvDate', () => {
  it('formats a date as local YYYY-MM-DD HH:MM', () => {
    // Constructed from local parts so the assertion holds in any timezone.
    expect(csvDate(new Date(2026, 5, 11, 8, 30))).toBe('2026-06-11 08:30');
  });

  it('zero-pads every field', () => {
    expect(csvDate(new Date(2026, 0, 2, 3, 4))).toBe('2026-01-02 03:04');
  });

  it('renders a missing date as an empty cell', () => {
    expect(csvDate(null)).toBe('');
    expect(csvDate(undefined)).toBe('');
  });
});

describe('csvResponse', () => {
  it('is served as a UTF-8 CSV download that is never cached', () => {
    const response = csvResponse('report.csv', toCsv(['a'], [['b']]));

    expect(response.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
    expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="report.csv"');
    // Reports contain names and amounts; a shared browser must not keep them.
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('sends the body through byte for byte, BOM included', async () => {
    const body = toCsv(['a'], [['b']]);
    const sent = Buffer.from(await csvResponse('report.csv', body).arrayBuffer());

    // Asserted on bytes rather than via .text(), which decodes UTF-8 and drops
    // the leading BOM — the BOM is exactly what Excel needs to see.
    expect(sent.toString('hex')).toBe(Buffer.from(body, 'utf8').toString('hex'));
    expect(sent.subarray(0, 3).toString('hex')).toBe('efbbbf');
  });

  // Both call sites build the filename from a date. This test records that
  // assumption: the filename is interpolated into a header without escaping, so
  // passing user input here would let a quote break out of the header value.
  it('is only ever given a filename the app itself built', () => {
    for (const route of ['ledger', 'requests']) {
      const source = readRoute(route);
      expect(source).toMatch(/csvResponse\(`sfxc-[a-z-]+-\$\{new Date\(\)/);
    }
  });
});

function readRoute(name: string) {
  return readFileSync(`app/api/reports/${name}/route.ts`, 'utf8');
}
