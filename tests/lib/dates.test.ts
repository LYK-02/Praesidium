import { describe, it, expect } from 'vitest';
import {
  parseIsoDate,
  hoursRemaining,
  formatRemainingTime,
  isImminent,
  nowUtc,
} from '@/lib/dates';

describe('Date Utilities', () => {
  it('returns valid UTC ISO date string', () => {
    const utc = nowUtc();
    expect(utc).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('parses valid ISO dates and rejects invalid ones', () => {
    const valid = parseIsoDate('2026-11-12T12:00:00.000Z');
    expect(valid).toBeInstanceOf(Date);
    expect(() => parseIsoDate('not-a-date')).toThrow(TypeError);
  });

  it('calculates remaining hours accurately', () => {
    const base = new Date('2026-10-15T12:00:00.000Z');
    const deadline = '2026-10-16T12:00:00.000Z'; // 24 hours later
    expect(hoursRemaining(deadline, base)).toBe(24);
  });

  it('formats remaining time correctly', () => {
    const base = new Date('2026-10-15T12:00:00.000Z');

    // 14 hours later
    const h14 = '2026-10-16T02:00:00.000Z';
    expect(formatRemainingTime(h14, base)).toBe('14h left');

    // 3 days later
    const d3 = '2026-10-18T12:00:00.000Z';
    expect(formatRemainingTime(d3, base)).toBe('3d left');

    // 30 minutes later
    const m30 = '2026-10-15T12:30:00.000Z';
    expect(formatRemainingTime(m30, base)).toBe('30m left');

    // Past due
    const past = '2026-10-14T12:00:00.000Z';
    expect(formatRemainingTime(past, base)).toBe('Overdue');
  });

  it('detects imminent deadlines correctly', () => {
    const base = new Date('2026-10-15T12:00:00.000Z');
    const imminent = '2026-10-16T00:00:00.000Z'; // 12 hours away
    const farAway = '2026-10-25T00:00:00.000Z'; // 10 days away

    expect(isImminent(imminent, 24, base)).toBe(true);
    expect(isImminent(farAway, 24, base)).toBe(false);
  });
});
