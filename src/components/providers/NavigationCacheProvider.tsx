"use client";

import React, { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

interface NavigationCacheProviderProps {
  children: React.ReactNode;
}

/**
 * Enhanced Navigation Cache Provider for faster page transitions
 * Implements intelligent route preloading and caching
 */
export function NavigationCacheProvider({
  children,
}: NavigationCacheProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const preloadedRoutes = useRef(new Set<string>());
  const preloadQueue = useRef<string[]>([]);
  const isPreloading = useRef(false);

  // Common routes based on navigation structure
  const PRIORITY_ROUTES = [
    "/dashboard",
    "/cars",
    "/galleries",
    "/projects",
    "/contacts",
    "/events",
    "/market",
  ];

  // Secondary routes preloaded based on current context
  const CONTEXTUAL_ROUTES = {
    "/dashboard": ["/cars", "/projects", "/galleries"],
    "/cars": ["/cars", "/galleries", "/projects"],
    "/galleries": ["/cars", "/projects", "/images"],
    "/projects": ["/cars", "/events", "/deliverables"],
    "/contacts": ["/projects", "/events"],
    "/events": ["/projects", "/contacts", "/schedule"],
    "/market": ["/auctions", "/cars"],
  };

  /**
   * Preload a route with intelligent batching
   */
  const preloadRoute = async (href: string, priority: boolean = false) => {
    if (preloadedRoutes.current.has(href)) return;

    try {
      preloadedRoutes.current.add(href);

      if (priority) {
        // High priority routes preload immediately
        await router.prefetch(href);
      } else {
        // Add to queue for batch processing
        preloadQueue.current.push(href);
        processPreloadQueue();
      }
    } catch (error) {
      console.warn(`Failed to preload route: ${href}`, error);
      preloadedRoutes.current.delete(href);
    }
  };

  /**
   * Process preload queue with rate limiting
   */
  const processPreloadQueue = async () => {
    if (isPreloading.current || preloadQueue.current.length === 0) return;

    isPreloading.current = true;

    try {
      // Process up to 3 routes at once to avoid overwhelming the browser
      const batch = preloadQueue.current.splice(0, 3);

      await Promise.allSettled(batch.map((href) => router.prefetch(href)));

      // Continue processing if more routes in queue
      if (preloadQueue.current.length > 0) {
        setTimeout(processPreloadQueue, 100); // Small delay between batches
      }
    } finally {
      isPreloading.current = false;
    }
  };

  /**
   * Preload priority routes on mount
   */
  useEffect(() => {
    // Preload critical navigation routes immediately
    PRIORITY_ROUTES.forEach((route) => {
      if (route !== pathname) {
        preloadRoute(route, true);
      }
    });

    // Preload contextual routes based on current page
    const contextualRoutes =
      CONTEXTUAL_ROUTES[pathname as keyof typeof CONTEXTUAL_ROUTES];
    if (contextualRoutes) {
      setTimeout(() => {
        contextualRoutes.forEach((route) => {
          if (route !== pathname) {
            preloadRoute(route, false);
          }
        });
      }, 500); // Delay to not interfere with initial page load
    }
  }, [pathname]);

  /**
   * Global link hover handler for intelligent preloading
   */
  useEffect(() => {
    const handleLinkHover = (e: MouseEvent) => {
      const target = e.target;

      // Check if target is an Element (not a text node or other non-element)
      if (!target || !(target instanceof Element)) {
        return;
      }

      // Find the closest anchor tag
      const link = target.closest('a[href^="/"]') as HTMLAnchorElement;

      if (link?.href) {
        try {
          const href = new URL(link.href).pathname;
          preloadRoute(href, false);
        } catch (error) {
          // Ignore invalid URLs
          console.warn("Invalid URL for preloading:", link.href);
        }
      }
    };

    // Use mouseover instead of mouseenter for better event delegation
    document.addEventListener("mouseover", handleLinkHover, {
      capture: true,
      passive: true, // Performance optimization
    });

    return () => {
      document.removeEventListener("mouseover", handleLinkHover, {
        capture: true,
      });
    };
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      preloadedRoutes.current.clear();
      preloadQueue.current = [];
      isPreloading.current = false;
    };
  }, []);

  return <>{children}</>;
}
