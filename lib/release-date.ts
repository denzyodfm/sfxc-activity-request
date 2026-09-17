export function parseReleaseDate(value: unknown): Date | null | undefined {
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : undefined;
}

export function releaseDateInputValue(value: Date | string | null | undefined): string {
  return value ? new Date(value).toISOString().slice(0, 10) : '';
}

export function hasBothReleaseDates(value: { scheduledReleaseDate: Date | null; actualReleaseDate: Date | null }): boolean {
  return Boolean(value.scheduledReleaseDate && value.actualReleaseDate);
}
