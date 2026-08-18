/**
 * Minimal RFC 4180 CSV writer.
 *
 * Values are quoted whenever they contain a delimiter, quote, or newline, and
 * embedded quotes are doubled. Anything that could be read as a formula by a
 * spreadsheet is prefixed so it is shown as text instead — an exported field
 * beginning with `=`, `+`, `-`, or `@` is otherwise executed on open, which
 * turns an uploaded particulars field into code running on someone's desktop.
 */

const FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return '';

  let text = value instanceof Date ? value.toISOString() : String(value);

  if (FORMULA_PREFIXES.some((prefix) => text.startsWith(prefix))) {
    text = `'${text}`;
  }

  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(escapeCell).join(',')];

  for (const row of rows) {
    lines.push(row.map(escapeCell).join(','));
  }

  // A BOM so Excel opens UTF-8 correctly — without it peso signs and accented
  // names arrive mangled.
  return `﻿${lines.join('\r\n')}\r\n`;
}

/** Builds a download response for a CSV body. */
export function csvResponse(filename: string, body: string) {
  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store'
    }
  });
}

/** Formats a date for a spreadsheet cell in local time. */
export function csvDate(value: Date | null | undefined) {
  if (!value) return '';

  const pad = (n: number) => String(n).padStart(2, '0');

  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}`;
}
