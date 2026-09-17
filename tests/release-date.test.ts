import { describe, expect, it } from 'vitest';
import { parseReleaseDate, releaseDateInputValue } from '@/lib/release-date';

describe('scheduled release date', () => {
  it('accepts a real date and preserves the calendar day', () => {
    expect(parseReleaseDate('2026-09-17')?.toISOString()).toBe('2026-09-17T00:00:00.000Z');
    expect(releaseDateInputValue('2026-09-17T00:00:00.000Z')).toBe('2026-09-17');
  });
  it('rejects invalid dates and permits clearing an unscheduled voucher', () => {
    expect(parseReleaseDate('2026-02-30')).toBeUndefined();
    expect(parseReleaseDate('09/17/2026')).toBeUndefined();
    expect(parseReleaseDate('')).toBeNull();
  });
});
