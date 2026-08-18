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

  if (Math.round(amount * 100) !== Number((amount * 100).toFixed(0))) {
    return { error: 'Amount cannot have more than two decimal places.' };
  }

  // Normalise to centavos so floating point noise never reaches the database.
  return { amount: Math.round(amount * 100) / 100 };
}
