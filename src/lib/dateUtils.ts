import { format } from "date-fns";

/**
 * Format a date string properly handling UTC dates for all-day events
 * This prevents timezone conversion issues that can cause off-by-one day errors
 */
export function formatEventDate(
  dateString: string | undefined | null,
  formatPattern: string = "PP"
): string {
  if (!dateString) return "-";

  try {
    const date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "-";
    }

    // For all-day events stored as UTC, we need to avoid timezone conversion
    // Check if this looks like a UTC midnight date (likely all-day event)
    const isLikelyAllDay =
      dateString.includes("T00:00:00") &&
      (dateString.includes("Z") || dateString.includes("+00:00"));

    if (isLikelyAllDay) {
      // Format the date using UTC methods to avoid timezone conversion
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth();
      const day = date.getUTCDate();

      // Create a new date in local timezone with the same year/month/day
      const localDate = new Date(year, month, day);
      return format(localDate, formatPattern);
    } else {
      // For timed events, use normal formatting
      return format(date, formatPattern);
    }
  } catch (error) {
    console.error("Error formatting date:", dateString, error);
    return "-";
  }
}

/**
 * Format a date string with time included (for event start/end times)
 */
export function formatEventDateTime(
  dateString: string | undefined | null
): string {
  return formatEventDate(dateString, "PPp");
}

/**
 * Format a date string for display in tables (shorter format)
 */
export function formatEventDateShort(
  dateString: string | undefined | null
): string {
  return formatEventDate(dateString, "MMM d, yyyy");
}

/**
 * Format a date string for calendar display
 */
export function formatEventDateCalendar(
  dateString: string | undefined | null
): string {
  return formatEventDate(dateString, "MMM d, yyyy 'at' h:mm a");
}
