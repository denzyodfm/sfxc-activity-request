export function formatMoney(amount: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2
  }).format(amount);
}

/** Largest amount a single request may carry, as a guard against typos. */
export const MAX_REQUEST_AMOUNT = 100_000_000;

/**
 * Parses and validates a user-supplied peso amount.
 *
 * Returns either the number or an error message. Rejecting negatives matters:
 * a negative amount previously passed the `!amount` check and would have
 * *credited* the fund when the voucher completed.
 */
export function parseAmount(raw: unknown): { amount: number } | { error: string } {
  const amount = Number(typeof raw === 'string' ? raw.trim() : raw);

  if (!Number.isFinite(amount)) {
    return { error: 'Amount must be a valid number.' };
  }

  if (amount <= 0) {
    return { error: 'Amount must be greater than zero.' };
  }

  if (amount > MAX_REQUEST_AMOUNT) {
    return { error: `Amount must not exceed ${formatMoney(MAX_REQUEST_AMOUNT)}.` };
  }

  // Reject anything finer than a centavo.
  //
  // This used to compare Math.round(amount * 100) with
  // Number((amount * 100).toFixed(0)). Those two round identically, so the
  // check could never fail: 10.005 was silently rounded to 10.01, and — worse —
  // 0.001 passed the "greater than zero" guard above and then normalised to
  // exactly 0, producing a zero-amount request.
  //
  // Comparing against the centavo-rounded value needs a tolerance, because
  // amount * 100 is not exact in binary floating point: 1234.56 * 100 is
  // 123456.00000000001. The tolerance is relative so it still holds at
  // MAX_REQUEST_AMOUNT, where one unit in the last place is already ~2e-6.
  const centavos = amount * 100;
  const tolerance = Math.max(1e-6, Math.abs(centavos) * 1e-12);

  if (Math.abs(centavos - Math.round(centavos)) > tolerance) {
    return { error: 'Amount cannot have more than two decimal places.' };
  }

  // Normalise to centavos so floating point noise never reaches the database.
  return { amount: Math.round(centavos) / 100 };
}
