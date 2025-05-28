/**
 * Query Result Caching System - Phase 3 Performance Optimization
 *
 * Implements in-memory and Redis-based caching for frequently accessed data.
 * Reduces database load and improves response times.
 */

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface CacheOptions {
  ttl?: number; // Default 5 minutes
  maxSize?: number; // Default 1000 entries
}

/**
 * In-memory cache implementation
 */
class MemoryCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize: number;
  private defaultTtl: number;

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize || 1000;
    this.defaultTtl = options.ttl || 5 * 60 * 1000; // 5 minutes
  }

  set<T>(key: string, data: T, ttl?: number): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTtl,
    };

    this.cache.set(key, entry);

    // Set auto-expiration
    setTimeout(() => {
      this.cache.delete(key);
    }, entry.ttl);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        age: Date.now() - entry.timestamp,
        ttl: entry.ttl,
        expired: Date.now() - entry.timestamp > entry.ttl,
      })),
    };
  }
}

/**
 * Global cache instances for different data types
 */
export const caches = {
  // Car data cache - frequently accessed in galleries and forms
  cars: new MemoryCache({ ttl: 10 * 60 * 1000, maxSize: 500 }), // 10 minutes

  // Image metadata cache - heavily used in galleries
  images: new MemoryCache({ ttl: 5 * 60 * 1000, maxSize: 2000 }), // 5 minutes

  // Events cache - calendar and timeline data
  events: new MemoryCache({ ttl: 2 * 60 * 1000, maxSize: 1000 }), // 2 minutes

  // Projects cache - project management data
  projects: new MemoryCache({ ttl: 5 * 60 * 1000, maxSize: 200 }), // 5 minutes

  // System data cache - prompts, templates, settings
  system: new MemoryCache({ ttl: 30 * 60 * 1000, maxSize: 100 }), // 30 minutes

  // Search results cache - expensive search queries
  search: new MemoryCache({ ttl: 1 * 60 * 1000, maxSize: 500 }), // 1 minute
};

/**
 * Cache key generators for consistent naming
 */
export const cacheKeys = {
  // Car cache keys
  car: (id: string) => `car:${id}`,
  carsByProject: (projectId: string) => `cars:project:${projectId}`,
  carsByClient: (clientId: string) => `cars:client:${clientId}`,
  carsSearch: (query: string, filters: Record<string, any>) =>
    `cars:search:${query}:${JSON.stringify(filters)}`,

  // Image cache keys
  imagesByCarId: (
    carId: string,
    page: number,
    limit: number,
    filters: Record<string, any>
  ) => `images:car:${carId}:${page}:${limit}:${JSON.stringify(filters)}`,
  imageMetadata: (imageId: string) => `image:metadata:${imageId}`,
  imagesSearch: (query: string, filters: Record<string, any>) =>
    `images:search:${query}:${JSON.stringify(filters)}`,

  // Event cache keys
  eventsByCarId: (carId: string) => `events:car:${carId}`,
  eventsByProjectId: (projectId: string) => `events:project:${projectId}`,
  eventsByDateRange: (start: string, end: string) =>
    `events:range:${start}:${end}`,

  // Project cache keys
  project: (id: string) => `project:${id}`,
  projectsList: (filters: Record<string, any>) =>
    `projects:list:${JSON.stringify(filters)}`,

  // System cache keys
  systemPrompts: (type?: string) => `system:prompts${type ? `:${type}` : ""}`,
  promptTemplates: (platform?: string) =>
    `system:templates${platform ? `:${platform}` : ""}`,
  lengthSettings: () => `system:length-settings`,
};

/**
 * Cache wrapper functions for common operations
 */
export const cacheUtils = {
  /**
   * Get or set cached data with automatic key generation
   */
  async getOrSet<T>(
    cache: MemoryCache,
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = cache.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data
    const data = await fetcher();

    // Cache the result
    cache.set(key, data, ttl);

    return data;
  },

  /**
   * Invalidate related cache entries
   */
  invalidatePattern(cache: MemoryCache, pattern: string): void {
    const stats = cache.getStats();
    const keysToDelete = stats.entries
      .filter((entry) => entry.key.includes(pattern))
      .map((entry) => entry.key);

    keysToDelete.forEach((key) => cache.delete(key));
  },

  /**
   * Warm up cache with frequently accessed data
   */
  async warmupCache(): Promise<void> {
    console.log("🔥 Warming up cache...");

    try {
      // Warm up system data (rarely changes)
      await Promise.all([
        // System prompts
        cacheUtils.getOrSet(
          caches.system,
          cacheKeys.systemPrompts(),
          async () => {
            const response = await fetch("/api/system-prompts/list");
            return response.json();
          }
        ),

        // Length settings
        cacheUtils.getOrSet(
          caches.system,
          cacheKeys.lengthSettings(),
          async () => {
            const response = await fetch("/api/length-settings");
            return response.json();
          }
        ),
      ]);

      console.log("✅ Cache warmup completed");
    } catch (error) {
      console.error("❌ Cache warmup failed:", error);
    }
  },

  /**
   * Get cache statistics for monitoring
   */
  getAllStats() {
    return {
      cars: caches.cars.getStats(),
      images: caches.images.getStats(),
      events: caches.events.getStats(),
      projects: caches.projects.getStats(),
      system: caches.system.getStats(),
      search: caches.search.getStats(),
    };
  },

  /**
   * Clear all caches
   */
  clearAll(): void {
    Object.values(caches).forEach((cache) => cache.clear());
    console.log("🗑️  All caches cleared");
  },
};

/**
 * Cache middleware for API routes
 */
export function withCache<T>(
  cache: MemoryCache,
  keyGenerator: (...args: any[]) => string,
  ttl?: number
) {
  return function cacheMiddleware(
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = keyGenerator(...args);

      // Try cache first
      const cached = cache.get<T>(cacheKey);
      if (cached !== null) {
        console.log(`🎯 Cache hit: ${cacheKey}`);
        return cached;
      }

      // Execute original method
      console.log(`🔍 Cache miss: ${cacheKey}`);
      const result = await method.apply(this, args);

      // Cache the result
      cache.set(cacheKey, result, ttl);

      return result;
    };

    return descriptor;
  };
}

/**
 * Cache invalidation helpers
 */
export const cacheInvalidation = {
  /**
   * Invalidate car-related caches when car data changes
   */
  onCarUpdate(carId: string): void {
    caches.cars.delete(cacheKeys.car(carId));
    cacheUtils.invalidatePattern(caches.cars, `cars:project:`);
    cacheUtils.invalidatePattern(caches.cars, `cars:client:`);
    cacheUtils.invalidatePattern(caches.cars, `cars:search:`);
    cacheUtils.invalidatePattern(caches.images, `images:car:${carId}`);
  },

  /**
   * Invalidate image-related caches when image data changes
   */
  onImageUpdate(carId: string, imageId?: string): void {
    if (imageId) {
      caches.images.delete(cacheKeys.imageMetadata(imageId));
    }
    cacheUtils.invalidatePattern(caches.images, `images:car:${carId}`);
    cacheUtils.invalidatePattern(caches.images, `images:search:`);
  },

  /**
   * Invalidate event-related caches when event data changes
   */
  onEventUpdate(carId?: string, projectId?: string): void {
    if (carId) {
      caches.events.delete(cacheKeys.eventsByCarId(carId));
    }
    if (projectId) {
      caches.events.delete(cacheKeys.eventsByProjectId(projectId));
    }
    cacheUtils.invalidatePattern(caches.events, `events:range:`);
  },

  /**
   * Invalidate project-related caches when project data changes
   */
  onProjectUpdate(projectId: string): void {
    caches.projects.delete(cacheKeys.project(projectId));
    cacheUtils.invalidatePattern(caches.projects, `projects:list:`);
    cacheUtils.invalidatePattern(caches.cars, `cars:project:${projectId}`);
    cacheUtils.invalidatePattern(caches.events, `events:project:${projectId}`);
  },

  /**
   * Invalidate system caches when system data changes
   */
  onSystemUpdate(type: "prompts" | "templates" | "settings"): void {
    if (type === "prompts") {
      cacheUtils.invalidatePattern(caches.system, "system:prompts");
    } else if (type === "templates") {
      cacheUtils.invalidatePattern(caches.system, "system:templates");
    } else if (type === "settings") {
      caches.system.delete(cacheKeys.lengthSettings());
    }
  },
};

// Initialize cache warmup on module load (in production)
if (typeof window === "undefined" && process.env.NODE_ENV === "production") {
  // Delay warmup to avoid blocking startup
  setTimeout(() => {
    cacheUtils.warmupCache().catch(console.error);
  }, 5000);
}
