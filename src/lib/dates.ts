/**
 * Praesidium — Date & Time Utilities
 * Rule: Store all timestamps in UTC ISO-8601.
 * Surface time-to-deadline clearly across all workflows.
 */

/**
 * Returns current timestamp in UTC ISO-8601 format.
 */
export function nowUtc(): string {
  return new Date().toISOString();
}

/**
 * Parses and verifies an ISO-8601 date string.
 */
export function parseIsoDate(dateString: string): Date {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new TypeError(`Invalid ISO date string: "${dateString}"`);
  }
  return date;
}

/**
 * Calculates remaining hours until a target deadline.
 * Negative number if already past due.
 */
export function hoursRemaining(deadlineIso: string, fromDate?: Date): number {
  const deadline = parseIsoDate(deadlineIso);
  const now = fromDate ?? new Date();
  const diffMs = deadline.getTime() - now.getTime();
  return diffMs / (1000 * 60 * 60);
}

/**
 * Formats time remaining for display (e.g. "14h left", "2d left", "45m left", "Overdue").
 */
export function formatRemainingTime(deadlineIso: string, fromDate?: Date): string {
  const hours = hoursRemaining(deadlineIso, fromDate);

  if (hours <= 0) {
    return 'Overdue';
  }

  if (hours < 1) {
    const minutes = Math.max(1, Math.round(hours * 60));
    return `${minutes}m left`;
  }

  if (hours < 48) {
    return `${Math.round(hours)}h left`;
  }

  const days = Math.round(hours / 24);
  return `${days}d left`;
}

/**
 * Checks whether a deadline is imminent (default: ≤ 24 hours).
 */
export function isImminent(deadlineIso: string, thresholdHours = 24, fromDate?: Date): boolean {
  const hours = hoursRemaining(deadlineIso, fromDate);
  return hours > 0 && hours <= thresholdHours;
}
