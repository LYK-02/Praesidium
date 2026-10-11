/**
 * Praesidium — Money Utilities
 * Rule: Store money as integer minor units (cents) to avoid floating point errors.
 * Format only at the display edge.
 */

/**
 * Converts a string or number decimal currency amount to integer minor units (cents).
 * E.g. "45.00" -> 4500, "12.5" -> 1250, 99.99 -> 9999
 */
export function toMinorUnits(amount: string | number): number {
  if (typeof amount === 'number') {
    return Math.round(amount * 100);
  }

  const sanitized = amount.trim().replace(/,/g, '');
  if (!sanitized || isNaN(Number(sanitized))) {
    throw new TypeError(`Invalid money value: "${amount}"`);
  }

  const parts = sanitized.split('.');
  const whole = parseInt(parts[0] || '0', 10);
  const fractionStr = (parts[1] || '').padEnd(2, '0').slice(0, 2);
  const fraction = parseInt(fractionStr, 10);

  const sign = sanitized.startsWith('-') ? -1 : 1;
  const absMinor = Math.abs(whole) * 100 + fraction;
  return sign * absMinor;
}

/**
 * Converts integer minor units back to a decimal number.
 * E.g. 4500 -> 45.00
 */
export function fromMinorUnits(minorUnits: number): number {
  return minorUnits / 100;
}

/**
 * Formats integer minor units for display with currency symbol or code.
 * E.g. (4500, 'USD') -> "$45.00"
 */
export function formatMoney(minorUnits: number, currency = 'USD'): string {
  const decimal = fromMinorUnits(minorUnits);
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(decimal);
  } catch {
    return `${currency.toUpperCase()} ${decimal.toFixed(2)}`;
  }
}
