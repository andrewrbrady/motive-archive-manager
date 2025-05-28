/**
 * Instant Navigation System - Prioritizes speed over preloading
 *
 * Philosophy: Show pages instantly, load data after
 * 1. ✅ Instant page transitions
 * 2. ✅ Minimal preloading (only on explicit hover)
 * 3. ✅ No debouncing delays
 * 4. ✅ No aggressive caching that slows things down
 */

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

/**
 * Instant router - no delays, immediate navigation
 */
class InstantRouter {
  private static instance: InstantRouter;
  private router: any = null;

  static getInstance(): InstantRouter {
    if (!InstantRouter.instance) {
      InstantRouter.instance = new InstantRouter();
    }
    return InstantRouter.instance;
  }

  setRouter(router: any) {
    this.router = router;
  }

  /**
   * Instant replace - no delays
   */
  replace(url: string, options: any = {}) {
    if (!this.router) return;
    this.router.replace(url, options);
  }

  /**
   * Instant push - no delays
   */
  push(url: string, options: any = {}) {
    if (!this.router) return;
    this.router.push(url, options);
  }
}

/**
 * Minimal navigation cache - only preload on explicit hover
 */
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

  /**
   * Preload only on hover - no aggressive preloading
   */
  async preloadOnHover(href: string): Promise<void> {
    if (!this.router || this.hoverPreloads.has(href)) return;

    this.hoverPreloads.add(href);

    try {
      // Simple prefetch without high priority to avoid blocking
      await this.router.prefetch(href);
    } catch (error) {
      console.warn("Failed to preload on hover:", href, error);
      this.hoverPreloads.delete(href);
    }
  }

  /**
   * Clear hover preloads periodically
   */
  cleanup(): void {
    // Clear hover preloads after 2 minutes
    setTimeout(
      () => {
        this.hoverPreloads.clear();
      },
      2 * 60 * 1000
    );
  }
}

/**
 * Hook for instant navigation
 */
export function useFastRouter() {
  const router = useRouter();
  const instantRouter = InstantRouter.getInstance();

  useEffect(() => {
    instantRouter.setRouter(router);
  }, [router, instantRouter]);

  const fastReplace = useCallback(
    (url: string, options: any = {}) => {
      instantRouter.replace(url, options);
    },
    [instantRouter]
  );

  const fastPush = useCallback(
    (url: string, options: any = {}) => {
      instantRouter.push(url, options);
    },
    [instantRouter]
  );

  const immediateNavigation = useCallback(
    (method: "push" | "replace", url: string, options: any = {}) => {
      instantRouter[method](url, options);
    },
    [instantRouter]
  );

  return {
    fastReplace,
    fastPush,
    immediateNavigation,
    clearPendingNavigations: () => {}, // No-op since no timeouts
  };
}

/**
 * Hook for minimal navigation caching
 */
export function useMinimalNavigationCache() {
  const router = useRouter();
  const cache = MinimalNavigationCache.getInstance();

  useEffect(() => {
    cache.setRouter(router);
  }, [router, cache]);

  const preloadOnHover = useCallback(
    (href: string) => {
      cache.preloadOnHover(href);
    },
    [cache]
  );

  return {
    preloadOnHover,
  };
}

/**
 * Enhanced Link hook with minimal preloading
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
  const { preloadOnHover: preload } = useMinimalNavigationCache();

  const handleMouseEnter = useCallback(() => {
    if (preloadOnHover) {
      preload(href);
    }
  }, [preload, href, preloadOnHover]);

  const handleFocus = useCallback(() => {
    if (preloadOnHover) {
      preload(href);
    }
  }, [preload, href, preloadOnHover]);

  return {
    linkProps: {
      href,
      prefetch,
      onMouseEnter: handleMouseEnter,
      onFocus: handleFocus,
    },
  };
}

// Legacy exports for backward compatibility
export const useDebouncedRouter = useFastRouter;
export const useNavigationCache = useMinimalNavigationCache;
export const useCachedLink = useFastLink;

// Remove aggressive preloading hooks
export function usePreloadCommonRoutes() {
  // Do nothing - no aggressive preloading
}

export function useCacheMonitor() {
  // Do nothing - no monitoring needed
}
