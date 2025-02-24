import { NumberFormat, NumberOptions } from "./types";

/**
 * Formats a number according to the specified options
 */
export function formatNumber(
  value: number,
  options: NumberOptions = {}
): string {
  const {
    format = "decimal",
    precision = 2,
    currency = "USD",
    locale = "en-US",
  } = options;

  const formatOptions: Intl.NumberFormatOptions = {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  };

  switch (format) {
    case "currency":
      formatOptions.style = "currency";
      formatOptions.currency = currency;
      break;
    case "percent":
      formatOptions.style = "percent";
      break;
    case "decimal":
    default:
      formatOptions.style = "decimal";
      break;
  }

  return new Intl.NumberFormat(locale, formatOptions).format(value);
}

/**
 * Rounds a number to the specified number of decimal places
 */
export function round(value: number, decimals = 0): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}

/**
 * Clamps a number between a minimum and maximum value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Returns true if the value is between min and max (inclusive)
 */
export function isBetween(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Returns true if the value is a positive number
 */
export function isPositive(value: number): boolean {
  return value > 0;
}

/**
 * Returns true if the value is a negative number
 */
export function isNegative(value: number): boolean {
  return value < 0;
}

/**
 * Returns true if the value is zero
 */
export function isZero(value: number): boolean {
  return value === 0;
}

/**
 * Returns true if the value is an integer
 */
export function isInteger(value: number): boolean {
  return Number.isInteger(value);
}

/**
 * Returns true if the value is a float
 */
export function isFloat(value: number): boolean {
  return !Number.isInteger(value);
}

/**
 * Returns true if the value is a safe integer
 */
export function isSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value);
}

/**
 * Returns true if the value is finite
 */
export function isFinite(value: number): boolean {
  return Number.isFinite(value);
}

/**
 * Returns true if the value is NaN
 */
export function isNaN(value: number): boolean {
  return Number.isNaN(value);
}

/**
 * Converts a number to a percentage string
 */
export function toPercentage(value: number, decimals = 0): string {
  return `${round(value * 100, decimals)}%`;
}

/**
 * Formats bytes to a human-readable string
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${round(bytes / Math.pow(k, i), decimals)} ${sizes[i]}`;
}

/**
 * Generates a random number between min and max (inclusive)
 */
export function random(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Calculates the sum of an array of numbers
 */
export function sum(numbers: number[]): number {
  return numbers.reduce((acc, curr) => acc + curr, 0);
}

/**
 * Calculates the average of an array of numbers
 */
export function average(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return sum(numbers) / numbers.length;
}

/**
 * Returns the minimum value in an array of numbers
 */
export function min(numbers: number[]): number {
  return Math.min(...numbers);
}

/**
 * Returns the maximum value in an array of numbers
 */
export function max(numbers: number[]): number {
  return Math.max(...numbers);
}

/**
 * Formats a number with commas as thousands separators
 */
export function formatWithCommas(value: number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Converts a number to its ordinal form (1st, 2nd, 3rd, etc.)
 */
export function toOrdinal(value: number): string {
  const j = value % 10;
  const k = value % 100;
  if (j === 1 && k !== 11) return `${value}st`;
  if (j === 2 && k !== 12) return `${value}nd`;
  if (j === 3 && k !== 13) return `${value}rd`;
  return `${value}th`;
}
