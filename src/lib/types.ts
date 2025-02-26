// Type definition for MongoDB ObjectId without importing mongodb
export type ObjectId = string;

// Helper function to check if a string is a valid ObjectId
export function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Sort order options
 */
export type SortOrder = "asc" | "desc";

/**
 * Options for array sorting
 */
export interface ArraySortOptions<T> {
  key: keyof T;
  order?: SortOrder;
  type?: "string" | "number" | "date";
}

/**
 * Validation rule types
 */
export type ValidationRule =
  | "required"
  | "email"
  | "url"
  | "phone"
  | "date"
  | "number"
  | string;

/**
 * Options for validation
 */
export interface ValidationOptions {
  rules?: ValidationRule[];
  custom?: (value: unknown) => boolean;
}

/**
 * String case options
 */
export type StringCase =
  | "lower"
  | "upper"
  | "title"
  | "camel"
  | "snake"
  | "kebab";

/**
 * String trim options
 */
export type StringTrim = "start" | "end" | "both";

/**
 * Options for string formatting
 */
export interface StringOptions {
  case?: StringCase;
  trim?: StringTrim;
  maxLength?: number;
  ellipsis?: string;
}

/**
 * Date format options
 */
export type DateFormat = "short" | "medium" | "long" | "full";

/**
 * Date time format options
 */
export type DateTimeFormat = "date" | "time" | "datetime";

/**
 * Options for date formatting
 */
export interface DateOptions {
  format?: DateFormat;
  type?: DateTimeFormat;
  timezone?: string;
}

/**
 * Number formatting options
 */
export type NumberFormat = "decimal" | "currency" | "percent";

/**
 * Options for number formatting
 */
export interface NumberOptions {
  format?: NumberFormat;
  precision?: number;
  currency?: string;
  locale?: string;
}
