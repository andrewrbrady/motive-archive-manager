import { DateFormat, DateOptions, DateTimeFormat } from "./types";

/**
 * Formats a date according to the specified options
 */
export function formatDate(
  date: Date | string | number,
  options: DateOptions = {}
): string {
  const dateObj = new Date(date);
  const { format = "medium", type = "date", timezone } = options;

  const formatOptions: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
  };

  switch (format) {
    case "short":
      formatOptions.dateStyle = "short";
      break;
    case "long":
      formatOptions.dateStyle = "long";
      break;
    case "full":
      formatOptions.dateStyle = "full";
      break;
    case "medium":
    default:
      formatOptions.dateStyle = "medium";
      break;
  }

  if (type === "time" || type === "datetime") {
    formatOptions.timeStyle = "medium";
  }

  return new Intl.DateTimeFormat("en-US", formatOptions).format(dateObj);
}

/**
 * Returns true if the date is valid
 */
export function isValidDate(date: unknown): date is Date {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Returns true if the date is in the past
 */
export function isPastDate(date: Date | string | number): boolean {
  const dateObj = new Date(date);
  return dateObj < new Date();
}

/**
 * Returns true if the date is in the future
 */
export function isFutureDate(date: Date | string | number): boolean {
  const dateObj = new Date(date);
  return dateObj > new Date();
}

/**
 * Returns true if the date is today
 */
export function isToday(date: Date | string | number): boolean {
  const dateObj = new Date(date);
  const today = new Date();
  return (
    dateObj.getDate() === today.getDate() &&
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getFullYear() === today.getFullYear()
  );
}

/**
 * Returns the difference between two dates in the specified unit
 */
export function getDateDiff(
  date1: Date | string | number,
  date2: Date | string | number,
  unit: "years" | "months" | "days" | "hours" | "minutes" | "seconds" = "days"
): number {
  const dateObj1 = new Date(date1);
  const dateObj2 = new Date(date2);
  const diff = Math.abs(dateObj1.getTime() - dateObj2.getTime());

  switch (unit) {
    case "years":
      return Math.floor(diff / (1000 * 60 * 60 * 24 * 365));
    case "months":
      return Math.floor(diff / (1000 * 60 * 60 * 24 * 30));
    case "hours":
      return Math.floor(diff / (1000 * 60 * 60));
    case "minutes":
      return Math.floor(diff / (1000 * 60));
    case "seconds":
      return Math.floor(diff / 1000);
    case "days":
    default:
      return Math.floor(diff / (1000 * 60 * 60 * 24));
  }
}

/**
 * Adds the specified amount of time to the date
 */
export function addToDate(
  date: Date | string | number,
  amount: number,
  unit: "years" | "months" | "days" | "hours" | "minutes" | "seconds" = "days"
): Date {
  const dateObj = new Date(date);

  switch (unit) {
    case "years":
      dateObj.setFullYear(dateObj.getFullYear() + amount);
      break;
    case "months":
      dateObj.setMonth(dateObj.getMonth() + amount);
      break;
    case "hours":
      dateObj.setHours(dateObj.getHours() + amount);
      break;
    case "minutes":
      dateObj.setMinutes(dateObj.getMinutes() + amount);
      break;
    case "seconds":
      dateObj.setSeconds(dateObj.getSeconds() + amount);
      break;
    case "days":
    default:
      dateObj.setDate(dateObj.getDate() + amount);
      break;
  }

  return dateObj;
}

/**
 * Returns the start of the specified unit for the date
 */
export function startOf(
  date: Date | string | number,
  unit: "year" | "month" | "week" | "day" | "hour" | "minute" | "second"
): Date {
  const dateObj = new Date(date);

  switch (unit) {
    case "year":
      return new Date(dateObj.getFullYear(), 0, 1);
    case "month":
      return new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
    case "week":
      const day = dateObj.getDay();
      return new Date(dateObj.setDate(dateObj.getDate() - day));
    case "day":
      return new Date(
        dateObj.getFullYear(),
        dateObj.getMonth(),
        dateObj.getDate()
      );
    case "hour":
      return new Date(dateObj.setMinutes(0, 0, 0));
    case "minute":
      return new Date(dateObj.setSeconds(0, 0));
    case "second":
      return new Date(dateObj.setMilliseconds(0));
    default:
      return dateObj;
  }
}

/**
 * Returns the end of the specified unit for the date
 */
export function endOf(
  date: Date | string | number,
  unit: "year" | "month" | "week" | "day" | "hour" | "minute" | "second"
): Date {
  const dateObj = new Date(date);

  switch (unit) {
    case "year":
      return new Date(dateObj.getFullYear(), 11, 31, 23, 59, 59, 999);
    case "month":
      return new Date(
        dateObj.getFullYear(),
        dateObj.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );
    case "week":
      const day = dateObj.getDay();
      return new Date(dateObj.setDate(dateObj.getDate() - day + 6));
    case "day":
      return new Date(
        dateObj.getFullYear(),
        dateObj.getMonth(),
        dateObj.getDate(),
        23,
        59,
        59,
        999
      );
    case "hour":
      return new Date(dateObj.setMinutes(59, 59, 999));
    case "minute":
      return new Date(dateObj.setSeconds(59, 999));
    case "second":
      return new Date(dateObj.setMilliseconds(999));
    default:
      return dateObj;
  }
}
