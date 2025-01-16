const CACHE_PREFIX = "cf_meta_";
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface CacheItem<T> {
  value: T;
  timestamp: number;
}

export function setCache<T>(key: string, value: T): void {
  try {
    const item: CacheItem<T> = {
      value,
      timestamp: Date.now(),
    };
    localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(item));
  } catch (error) {
    console.error("Error setting cache:", error);
  }
}

export function getCache<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!item) return null;

    const parsed: CacheItem<T> = JSON.parse(item);
    const now = Date.now();

    // Check if cache has expired
    if (now - parsed.timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    }

    return parsed.value;
  } catch (error) {
    console.error("Error getting cache:", error);
    return null;
  }
}

export function clearCache(key?: string): void {
  try {
    if (key) {
      localStorage.removeItem(`${CACHE_PREFIX}${key}`);
    } else {
      // Clear all cached metadata
      Object.keys(localStorage)
        .filter((key) => key.startsWith(CACHE_PREFIX))
        .forEach((key) => localStorage.removeItem(key));
    }
  } catch (error) {
    console.error("Error clearing cache:", error);
  }
}
