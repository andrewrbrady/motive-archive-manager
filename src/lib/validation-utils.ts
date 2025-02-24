import { ValidationOptions, ValidationRule } from "./types";

/**
 * Validates a value against a set of rules
 */
export function validate(
  value: unknown,
  options: ValidationOptions = {}
): boolean {
  const { rules = [], custom } = options;

  // Run custom validation if provided
  if (custom && !custom(value)) {
    return false;
  }

  // Run standard validation rules
  return rules.every((rule) => validateRule(value, rule));
}

/**
 * Validates a value against a single rule
 */
function validateRule(value: unknown, rule: ValidationRule): boolean {
  switch (rule) {
    case "required":
      return isRequired(value);
    case "email":
      return isEmail(value);
    case "url":
      return isUrl(value);
    case "phone":
      return isPhone(value);
    case "date":
      return isDate(value);
    case "number":
      return isNumber(value);
    default:
      return true;
  }
}

/**
 * Checks if a value is not null, undefined, or empty string
 */
export function isRequired(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

/**
 * Checks if a value is a valid email address
 */
export function isEmail(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Checks if a value is a valid URL
 */
export function isUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if a value is a valid phone number
 */
export function isPhone(value: unknown): boolean {
  if (typeof value !== "string") return false;
  // Basic phone number validation (can be customized based on requirements)
  return /^\+?[\d\s-()]{10,}$/.test(value);
}

/**
 * Checks if a value is a valid date
 */
export function isDate(value: unknown): boolean {
  if (value instanceof Date) return !isNaN(value.getTime());
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return !isNaN(date.getTime());
  }
  return false;
}

/**
 * Checks if a value is a valid number
 */
export function isNumber(value: unknown): boolean {
  if (typeof value === "number") return !isNaN(value);
  if (typeof value === "string") return !isNaN(Number(value));
  return false;
}

/**
 * Checks if a value is a valid integer
 */
export function isInteger(value: unknown): boolean {
  return isNumber(value) && Number.isInteger(Number(value));
}

/**
 * Checks if a value is a valid float
 */
export function isFloat(value: unknown): boolean {
  return isNumber(value) && !Number.isInteger(Number(value));
}

/**
 * Checks if a value is within a range
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Checks if a string matches a regular expression
 */
export function matchesPattern(value: string, pattern: RegExp): boolean {
  return pattern.test(value);
}

/**
 * Checks if a value is a valid credit card number (using Luhn algorithm)
 */
export function isCreditCard(value: string): boolean {
  const sanitized = value.replace(/[^0-9]/g, "");
  if (!/^\d{13,19}$/.test(sanitized)) return false;

  let sum = 0;
  let isEven = false;

  for (let i = sanitized.length - 1; i >= 0; i--) {
    let digit = parseInt(sanitized[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Checks if a string contains only alphanumeric characters
 */
export function isAlphanumeric(value: string): boolean {
  return /^[a-zA-Z0-9]+$/.test(value);
}

/**
 * Checks if a string contains only alphabetic characters
 */
export function isAlpha(value: string): boolean {
  return /^[a-zA-Z]+$/.test(value);
}

/**
 * Checks if a string is a valid hex color
 */
export function isHexColor(value: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value);
}

/**
 * Checks if a string is a valid IPv4 address
 */
export function isIPv4(value: string): boolean {
  return (
    /^(\d{1,3}\.){3}\d{1,3}$/.test(value) &&
    value
      .split(".")
      .every((part) => parseInt(part, 10) >= 0 && parseInt(part, 10) <= 255)
  );
}

/**
 * Checks if a value is a valid JSON string
 */
export function isJSON(value: string): boolean {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if a string is a valid postal code (US format)
 */
export function isPostalCode(value: string): boolean {
  return /^\d{5}(-\d{4})?$/.test(value);
}

/**
 * Checks if a password meets minimum requirements
 */
export function isStrongPassword(value: string): boolean {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/.test(
    value
  );
}
