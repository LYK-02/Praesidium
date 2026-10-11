import { describe, it, expect } from 'vitest';
import { toMinorUnits, fromMinorUnits, formatMoney } from '@/lib/money';

describe('Money Utilities', () => {
  it('converts string decimals to integer minor units', () => {
    expect(toMinorUnits('45.00')).toBe(4500);
    expect(toMinorUnits('149.99')).toBe(14999);
    expect(toMinorUnits('0.01')).toBe(1);
    expect(toMinorUnits('0.00')).toBe(0);
    expect(toMinorUnits('100')).toBe(10000);
    expect(toMinorUnits('12.5')).toBe(1250);
  });

  it('converts number decimals to integer minor units', () => {
    expect(toMinorUnits(45.0)).toBe(4500);
    expect(toMinorUnits(149.99)).toBe(14999);
    expect(toMinorUnits(0.01)).toBe(1);
  });

  it('handles negative values correctly', () => {
    expect(toMinorUnits('-25.50')).toBe(-2550);
  });

  it('throws on invalid money input', () => {
    expect(() => toMinorUnits('invalid')).toThrow(TypeError);
    expect(() => toMinorUnits('')).toThrow(TypeError);
  });

  it('converts minor units back to decimal numbers', () => {
    expect(fromMinorUnits(4500)).toBe(45);
    expect(fromMinorUnits(14999)).toBe(149.99);
    expect(fromMinorUnits(1)).toBe(0.01);
  });

  it('formats money for display correctly', () => {
    const formatted = formatMoney(4500, 'USD');
    expect(formatted).toBe('$45.00');
    expect(formatMoney(14999, 'USD')).toBe('$149.99');
  });
});
