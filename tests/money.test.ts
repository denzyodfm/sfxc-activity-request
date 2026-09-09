import { describe, expect, it } from 'vitest';
import { MAX_REQUEST_AMOUNT, parseAmount } from '@/lib/money';

function amountOf(result: ReturnType<typeof parseAmount>) {
  if ('error' in result) throw new Error(`expected an amount, got: ${result.error}`);
  return result.amount;
}

function errorOf(result: ReturnType<typeof parseAmount>) {
  if (!('error' in result)) throw new Error(`expected an error, got: ${result.amount}`);
  return result.error;
}

describe('parseAmount', () => {
  it('accepts a plain number and a numeric string', () => {
    expect(amountOf(parseAmount(12500))).toBe(12500);
    expect(amountOf(parseAmount('12500'))).toBe(12500);
  });

  it('trims surrounding whitespace', () => {
    expect(amountOf(parseAmount('  8450.50  '))).toBe(8450.5);
  });

  it('keeps two decimal places', () => {
    expect(amountOf(parseAmount('0.01'))).toBe(0.01);
    expect(amountOf(parseAmount('1234.56'))).toBe(1234.56);
  });

  // The comment on parseAmount calls this out specifically: a negative amount
  // used to pass the falsiness check and would have credited the fund back on
  // voucher completion instead of debiting it.
  it('rejects negative amounts', () => {
    expect(errorOf(parseAmount(-1))).toMatch(/greater than zero/);
    expect(errorOf(parseAmount('-12500'))).toMatch(/greater than zero/);
  });

  it('rejects zero', () => {
    expect(errorOf(parseAmount(0))).toMatch(/greater than zero/);
    expect(errorOf(parseAmount('0'))).toMatch(/greater than zero/);
    expect(errorOf(parseAmount('0.00'))).toMatch(/greater than zero/);
  });

  it('rejects values that are not numbers at all', () => {
    for (const input of ['abc', '12,500', undefined, {}, [1, 2], NaN]) {
      expect(errorOf(parseAmount(input))).toMatch(/valid number/);
    }
  });

  // Number('') and Number(null) are both 0, so these are rejected by the
  // greater-than-zero rule rather than the is-a-number one. Either way they
  // never yield an amount.
  it('rejects blank input and null', () => {
    for (const input of ['', '   ', null]) {
      expect(errorOf(parseAmount(input))).toMatch(/greater than zero/);
    }
  });

  it('rejects infinity', () => {
    expect(errorOf(parseAmount(Infinity))).toMatch(/valid number/);
    expect(errorOf(parseAmount('-Infinity'))).toMatch(/valid number/);
  });

  it('rejects more than two decimal places', () => {
    expect(errorOf(parseAmount('10.005'))).toMatch(/two decimal places/);
    expect(errorOf(parseAmount(1.239))).toMatch(/two decimal places/);
    expect(errorOf(parseAmount('99.999'))).toMatch(/two decimal places/);
    expect(errorOf(parseAmount(12.3456))).toMatch(/two decimal places/);
  });

  // The decimal check used to compare two expressions that round identically,
  // so it never fired. Sub-centavo amounts then normalised to exactly 0 —
  // passing the greater-than-zero guard and creating a zero-amount request.
  it('rejects sub-centavo amounts rather than rounding them to zero', () => {
    for (const input of ['0.001', '0.004', 0.009, '0.0001']) {
      expect(errorOf(parseAmount(input))).toMatch(/two decimal places/);
    }
  });

  it('never returns zero for an input it accepted', () => {
    for (const input of ['0.01', '0.10', 0.05, '1', MAX_REQUEST_AMOUNT]) {
      expect(amountOf(parseAmount(input))).toBeGreaterThan(0);
    }
  });

  it('still accepts values whose centavo conversion is not exact in binary', () => {
    // 1234.56 * 100 is 123456.00000000001, not 123456.
    expect(amountOf(parseAmount(1234.56))).toBe(1234.56);
    expect(amountOf(parseAmount('8450.50'))).toBe(8450.5);
    expect(amountOf(parseAmount(70.07))).toBe(70.07);
  });

  it('applies the decimal rule at the top of the range too', () => {
    expect(amountOf(parseAmount(MAX_REQUEST_AMOUNT - 0.01))).toBe(MAX_REQUEST_AMOUNT - 0.01);
    expect(errorOf(parseAmount(MAX_REQUEST_AMOUNT - 0.005))).toMatch(/two decimal places/);
  });

  it('enforces the upper bound but allows the bound itself', () => {
    expect(amountOf(parseAmount(MAX_REQUEST_AMOUNT))).toBe(MAX_REQUEST_AMOUNT);
    expect(errorOf(parseAmount(MAX_REQUEST_AMOUNT + 1))).toMatch(/must not exceed/);
  });

  it('never returns a value that would round badly in the database', () => {
    // 0.1 + 0.2 style noise must not survive into a Decimal column.
    const parsed = amountOf(parseAmount(0.1 + 0.2));
    expect(parsed).toBe(0.3);
    expect(Number.isInteger(Math.round(parsed * 100))).toBe(true);
  });
});
