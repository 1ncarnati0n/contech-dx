/**
 * Date Utility Functions for Gantt
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Convert various date formats to ISO date string (YYYY-MM-DD)
 */
export function toIsoDate(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString().split("T")[0];
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed.length) {
      return undefined;
    }
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString().split("T")[0];
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value.toISOString().split("T")[0];
  }

  return undefined;
}

/**
 * Convert various formats to Date object or undefined
 * Handles "YYYY-MM-DD" format specifically to avoid UTC issues
 */
export function toDateOrUndefined(value: unknown): Date | undefined {
  if (!value && value !== 0) {
    return undefined;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed.length) {
      return undefined;
    }

    // Handle YYYY-MM-DD format specifically to use local timezone
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/;
    const match = trimmed.match(dateOnly);
    if (match) {
      const [, yearStr, monthStr, dayStr] = match;
      const year = Number(yearStr);
      const month = Number(monthStr) - 1; // JavaScript months are 0-indexed
      const day = Number(dayStr);
      if (Number.isInteger(year) && Number.isInteger(month) && Number.isInteger(day)) {
        const candidate = new Date(year, month, day);
        return Number.isNaN(candidate.getTime()) ? undefined : candidate;
      }
    }

    // Fallback to standard Date parsing
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  return undefined;
}

/**
 * Calculate duration in days between two dates
 */
export function calculateDaysBetween(start: Date, end: Date): number {
  const diff = (end.getTime() - start.getTime()) / MS_PER_DAY;
  return Number.isFinite(diff) && diff > 0 ? diff : 0;
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Format date for display (exclusive end date handling)
 * SVAR Gantt uses exclusive end dates, so we subtract 1 day for display
 */
export function formatDisplayDate(date: Date | string | undefined, isEndDate = false): string {
  if (!date) {
    return "";
  }

  const dateObj = typeof date === "string" ? toDateOrUndefined(date) : date;
  if (!dateObj) {
    return "";
  }

  // If this is an end date, subtract 1 day for display
  const displayDate = isEndDate ? addDays(dateObj, -1) : dateObj;

  const formatter = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(displayDate);
}

