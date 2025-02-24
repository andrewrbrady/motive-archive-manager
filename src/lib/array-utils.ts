import { ArraySortOptions, SortOrder } from "./types";

/**
 * Sorts an array of objects by a specified key
 */
export function sortBy<T>(array: T[], options: ArraySortOptions<T>): T[] {
  const { key, order = "asc", type = "string" } = options;

  return [...array].sort((a, b) => {
    if (!key) return 0;

    const aValue = a[key];
    const bValue = b[key];

    if (type === "number") {
      return order === "asc"
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    }

    if (type === "date") {
      const aDate = new Date(aValue as string | number | Date);
      const bDate = new Date(bValue as string | number | Date);
      return order === "asc"
        ? aDate.getTime() - bDate.getTime()
        : bDate.getTime() - aDate.getTime();
    }

    // Default string comparison
    const aString = String(aValue).toLowerCase();
    const bString = String(bValue).toLowerCase();
    return order === "asc"
      ? aString.localeCompare(bString)
      : bString.localeCompare(aString);
  });
}

/**
 * Groups an array of objects by a specified key
 */
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const groupKey = String(item[key]);
    return {
      ...groups,
      [groupKey]: [...(groups[groupKey] || []), item],
    };
  }, {} as Record<string, T[]>);
}

/**
 * Removes duplicate values from an array
 */
export function unique<T>(array: T[]): T[] {
  return Array.from(new Set(array));
}

/**
 * Removes duplicate objects from an array based on a key
 */
export function uniqueBy<T>(array: T[], key: keyof T): T[] {
  const seen = new Set();
  return array.filter((item) => {
    const value = item[key];
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

/**
 * Chunks an array into smaller arrays of specified size
 */
export function chunk<T>(array: T[], size: number): T[][] {
  return array.reduce((chunks, item, index) => {
    const chunkIndex = Math.floor(index / size);
    if (!chunks[chunkIndex]) {
      chunks[chunkIndex] = [];
    }
    chunks[chunkIndex].push(item);
    return chunks;
  }, [] as T[][]);
}

/**
 * Returns the intersection of two arrays
 */
export function intersection<T>(array1: T[], array2: T[]): T[] {
  return array1.filter((item) => array2.includes(item));
}

/**
 * Returns the difference between two arrays
 */
export function difference<T>(array1: T[], array2: T[]): T[] {
  return array1.filter((item) => !array2.includes(item));
}

/**
 * Returns the union of two arrays
 */
export function union<T>(array1: T[], array2: T[]): T[] {
  return unique([...array1, ...array2]);
}

/**
 * Flattens a nested array structure
 */
export function flatten<T>(array: (T | T[])[]): T[] {
  return array.reduce((flat: T[], item) => {
    return Array.isArray(item) ? [...flat, ...flatten(item)] : [...flat, item];
  }, []);
}

/**
 * Shuffles an array randomly
 */
export function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Returns a random element from an array
 */
export function sample<T>(array: T[]): T | undefined {
  if (array.length === 0) return undefined;
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Returns multiple random elements from an array
 */
export function sampleSize<T>(array: T[], size: number): T[] {
  if (size <= 0) return [];
  if (size >= array.length) return shuffle(array);
  return shuffle(array).slice(0, size);
}

/**
 * Moves an element from one index to another in an array
 */
export function move<T>(array: T[], fromIndex: number, toIndex: number): T[] {
  const result = [...array];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  return result;
}

/**
 * Returns the last n elements of an array
 */
export function takeRight<T>(array: T[], n = 1): T[] {
  return array.slice(Math.max(array.length - n, 0));
}

/**
 * Returns the first n elements of an array
 */
export function take<T>(array: T[], n = 1): T[] {
  return array.slice(0, n);
}

/**
 * Splits an array into two arrays based on a predicate
 */
export function partition<T>(
  array: T[],
  predicate: (item: T) => boolean
): [T[], T[]] {
  return array.reduce(
    ([pass, fail], item) => {
      return predicate(item)
        ? [[...pass, item], fail]
        : [pass, [...fail, item]];
    },
    [[] as T[], [] as T[]]
  );
}

/**
 * Returns true if all elements in the array satisfy the predicate
 */
export function every<T>(array: T[], predicate: (item: T) => boolean): boolean {
  return array.every(predicate);
}

/**
 * Returns true if any element in the array satisfies the predicate
 */
export function some<T>(array: T[], predicate: (item: T) => boolean): boolean {
  return array.some(predicate);
}
