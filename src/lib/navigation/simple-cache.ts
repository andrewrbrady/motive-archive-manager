/**
 * Enhanced Navigation System - Optimized for fast page transitions
 *
 * Philosophy: Instant feedback with smart preloading
 * 1. ✅ Instant visual feedback on navigation
 * 2. ✅ Smart preloading based on user behavior
 * 3. ✅ Performance monitoring and optimization
 * 4. ✅ Graceful error handling and fallbacks
 */

import { useRouter, usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Enhanced router with performance tracking
 */
class PerformanceRouter {
  private static instance: PerformanceRouter;
  private router: any = null;
  private navigationTimes = new Map<string, number>();
  private pendingNavigations = new Set<string>();

  static getInstance(): PerformanceRouter {
    if (!PerformanceRouter.instance) {
      PerformanceRouter.instance = new PerformanceRouter();
    }
    return PerformanceRouter.instance;
  }

  setRouter(router: any) {
    this.router = router;
  }

  /**
   * Navigate with performance tracking
   */
  async navigate(
    url: string,
    method: "push" | "replace" = "push",
    options: any = {}
  ) {
    if (!this.router || this.pendingNavigations.has(url)) return;

    const startTime = performance.now();
    this.pendingNavigations.add(url);

    try {
      // Track navigation start
      console.time(`Navigation-${url}`);

      if (method === "replace") {
        await this.router.replace(url, options);
      } else {
        await this.router.push(url, options);
      }

      // Track successful navigation
      const duration = performance.now() - startTime;
      this.navigationTimes.set(url, duration);
      console.timeEnd(`Navigation-${url}`);

      if (duration > 1000) {
        console.warn(
          `Slow navigation detected: ${url} took ${duration.toFixed(2)}ms`
        );
      }
    } catch (error) {
      console.error(`Navigation failed: ${url}`, error);
    } finally {
      this.pendingNavigations.delete(url);
    }
  }

  /**
   * Get navigation performance metrics
   */
  getPerformanceMetrics() {
    const times = Array.from(this.navigationTimes.values());
    if (times.length === 0) return null;

    return {
      averageTime: times.reduce((a, b) => a + b, 0) / times.length,
      maxTime: Math.max(...times),
      minTime: Math.min(...times),
      totalNavigations: times.length,
      slowNavigations: times.filter((t) => t > 1000).length,
    };
  }
}

/**
 * Smart navigation cache with intelligent preloading
 */
class SmartNavigationCache {
  private static instance: SmartNavigationCache;
  private router: any = null;
  private preloadedRoutes = new Set<string>();
  private userBehavior = new Map<string, number>(); // Track user navigation patterns
  private preloadQueue = new Set<string>();

  static getInstance(): SmartNavigationCache {
    if (!SmartNavigationCache.instance) {
      SmartNavigationCache.instance = new SmartNavigationCache();
    }
    return SmartNavigationCache.instance;
  }

  setRouter(router: any) {
    this.router = router;
  }

  /**
   * Track user navigation patterns
   */
  trackNavigation(from: string, to: string) {
    const pattern = `${from}->${to}`;
    this.userBehavior.set(pattern, (this.userBehavior.get(pattern) || 0) + 1);
  }

  /**
   * Get predicted next routes based on user behavior
   */
  getPredictedRoutes(currentRoute: string): string[] {
    const predictions: Array<{ route: string; confidence: number }> = [];

    this.userBehavior.forEach((count, pattern) => {
      const [from, to] = pattern.split("->");
      if (from === currentRoute) {
        predictions.push({ route: to, confidence: count });
      }
    });

    return predictions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3)
      .map((p) => p.route);
  }

  /**
   * Smart preload with behavior prediction
   */
  async smartPreload(href: string, currentRoute: string) {
    if (this.preloadedRoutes.has(href) || this.preloadQueue.has(href)) return;

    this.preloadQueue.add(href);

    try {
      await this.router.prefetch(href);
      this.preloadedRoutes.add(href);

      // Also preload predicted next routes
      const predicted = this.getPredictedRoutes(href);
      predicted.forEach((route) => {
        if (!this.preloadedRoutes.has(route)) {
          setTimeout(() => this.router.prefetch(route), 100);
        }
      });
    } catch (error) {
      console.warn("Failed to preload:", href, error);
    } finally {
      this.preloadQueue.delete(href);
    }
  }

  /**
   * Clear old cache entries periodically
   */
  cleanup() {
    // Keep cache size manageable
    if (this.preloadedRoutes.size > 50) {
      const routesToDelete = Array.from(this.preloadedRoutes).slice(0, 20);
      routesToDelete.forEach((route) => this.preloadedRoutes.delete(route));
    }
  }
}

/**
 * Enhanced hook for fast navigation with performance tracking
 */
export function useFastRouter() {
  const router = useRouter();
  const pathname = usePathname();
  const performanceRouter = PerformanceRouter.getInstance();
  const cache = SmartNavigationCache.getInstance();
  const [isNavigating, setIsNavigating] = useState(false);
  const lastPathname = useRef(pathname);

  useEffect(() => {
    performanceRouter.setRouter(router);
    cache.setRouter(router);
  }, [router]);

  // Track navigation patterns
  useEffect(() => {
    if (lastPathname.current !== pathname && pathname && lastPathname.current) {
      cache.trackNavigation(lastPathname.current, pathname);
      lastPathname.current = pathname;
    }
  }, [pathname]);

  const navigateWithPerformance = useCallback(
    async (
      url: string,
      method: "push" | "replace" = "push",
      options: any = {}
    ) => {
      setIsNavigating(true);
      await performanceRouter.navigate(url, method, options);
      setIsNavigating(false);
    },
    []
  );

  const fastPush = useCallback(
    (url: string, options: any = {}) =>
      navigateWithPerformance(url, "push", options),
    [navigateWithPerformance]
  );

  const fastReplace = useCallback(
    (url: string, options: any = {}) =>
      navigateWithPerformance(url, "replace", options),
    [navigateWithPerformance]
  );

  return {
    fastPush,
    fastReplace,
    isNavigating,
    getPerformanceMetrics: () => performanceRouter.getPerformanceMetrics(),
  };
}

/**
 * Enhanced hook for smart navigation caching
 */
export function useSmartNavigationCache() {
  const router = useRouter();
  const pathname = usePathname();
  const cache = SmartNavigationCache.getInstance();

  useEffect(() => {
    cache.setRouter(router);
  }, [router]);

  const preloadRoute = useCallback(
    (href: string) => {
      if (pathname) {
        cache.smartPreload(href, pathname);
      }
    },
    [pathname]
  );

  // Cleanup cache periodically
  useEffect(() => {
    const interval = setInterval(() => cache.cleanup(), 60000); // Every minute
    return () => clearInterval(interval);
  }, []);

  return { preloadRoute };
}

/**
 * Enhanced Link hook with smart preloading and performance tracking
 */
export function useFastLink({
  href,
  prefetch = true,
  preloadOnHover = true,
}: {
  href: string;
  prefetch?: boolean;
  preloadOnHover?: boolean;
}) {
  const { preloadRoute } = useSmartNavigationCache();
  const [isHovered, setIsHovered] = useState(false);
  const preloadedRef = useRef(false);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    if (preloadOnHover && !preloadedRef.current) {
      preloadRoute(href);
      preloadedRef.current = true;
    }
  }, [href, preloadOnHover, preloadRoute]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  const handleFocus = useCallback(() => {
    if (preloadOnHover && !preloadedRef.current) {
      preloadRoute(href);
      preloadedRef.current = true;
    }
  }, [href, preloadOnHover, preloadRoute]);

  return {
    linkProps: {
      href,
      prefetch,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onFocus: handleFocus,
    },
    isHovered,
  };
}

// Legacy exports for backward compatibility
export const useDebouncedRouter = useFastRouter;
export const useNavigationCache = useSmartNavigationCache;
export const useCachedLink = useFastLink;

// Keep minimal navigation cache for existing usage
class MinimalNavigationCache {
  private static instance: MinimalNavigationCache;
  private router: any = null;
  private hoverPreloads = new Set<string>();

  static getInstance(): MinimalNavigationCache {
    if (!MinimalNavigationCache.instance) {
      MinimalNavigationCache.instance = new MinimalNavigationCache();
    }
    return MinimalNavigationCache.instance;
  }

  setRouter(router: any) {
    this.router = router;
  }

  async preloadOnHover(href: string): Promise<void> {
    if (!this.router || this.hoverPreloads.has(href)) return;

    this.hoverPreloads.add(href);

    try {
      await this.router.prefetch(href);
    } catch (error) {
      console.warn("Failed to preload on hover:", href, error);
      this.hoverPreloads.delete(href);
    }
  }

  cleanup(): void {
    setTimeout(() => this.hoverPreloads.clear(), 2 * 60 * 1000);
  }
}

export function useMinimalNavigationCache() {
  const router = useRouter();
  const cache = MinimalNavigationCache.getInstance();

  useEffect(() => {
    cache.setRouter(router);
  }, [router]);

  const preloadOnHover = useCallback(
    (href: string) => cache.preloadOnHover(href),
    []
  );

  return { preloadOnHover };
}

// Cleanup functions (keeping for compatibility)
export function usePreloadCommonRoutes() {
  // Implementation moved to NavigationCacheProvider
}

export function useCacheMonitor() {
  // Implementation moved to performance router
}
