import { StringCase, StringOptions, StringTrim } from "./types";

/**
 * Converts a string to the specified case
 */
export function changeCase(str: string, caseType: StringCase): string {
  switch (caseType) {
    case "lower":
      return str.toLowerCase();
    case "upper":
      return str.toUpperCase();
    case "title":
      return str
        .toLowerCase()
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    case "camel":
      return str
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase());
    case "snake":
      return str
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .replace(/(^_|_$)/g, "");
    case "kebab":
      return str
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    default:
      return str;
  }
}

/**
 * Trims a string according to the specified options
 */
export function trimString(str: string, trimType: StringTrim = "both"): string {
  switch (trimType) {
    case "start":
      return str.trimStart();
    case "end":
      return str.trimEnd();
    case "both":
    default:
      return str.trim();
  }
}

/**
 * Truncates a string to the specified length and adds an ellipsis
 */
export function truncate(
  str: string,
  length: number,
  ellipsis = "..."
): string {
  if (str.length <= length) return str;
  return str.slice(0, length - ellipsis.length) + ellipsis;
}

/**
 * Slugifies a string (converts to lowercase, removes special characters, replaces spaces with hyphens)
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Generates a random string of the specified length
 */
export function randomString(
  length: number,
  charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}

/**
 * Formats a string with the provided values
 * Example: format('Hello {0}!', 'World') => 'Hello World!'
 */
export function format(str: string, ...args: any[]): string {
  return str.replace(/{(\d+)}/g, (match, index) => {
    return typeof args[index] !== "undefined" ? String(args[index]) : match;
  });
}

/**
 * Checks if a string contains only alphanumeric characters
 */
export function isAlphanumeric(str: string): boolean {
  return /^[a-zA-Z0-9]+$/.test(str);
}

/**
 * Checks if a string is a valid email address
 */
export function isEmail(str: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
}

/**
 * Checks if a string is a valid URL
 */
export function isUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if a string contains only digits
 */
export function isNumeric(str: string): boolean {
  return /^\d+$/.test(str);
}

/**
 * Reverses a string
 */
export function reverse(str: string): string {
  return str.split("").reverse().join("");
}

/**
 * Counts the occurrences of a substring in a string
 */
export function countOccurrences(str: string, searchStr: string): number {
  if (searchStr.length === 0) return 0;
  return str.split(searchStr).length - 1;
}

/**
 * Capitalizes the first letter of each word in a string
 */
export function capitalizeWords(str: string): string {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Removes all whitespace from a string
 */
export function removeWhitespace(str: string): string {
  return str.replace(/\s+/g, "");
}

/**
 * Escapes HTML special characters in a string
 */
export function escapeHtml(str: string): string {
  const htmlEntities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return str.replace(/[&<>"']/g, (char) => htmlEntities[char]);
}
