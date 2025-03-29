/**
 * Utility functions for handling HTTP cache headers
 */

import { NextResponse } from "next/server";

/**
 * Cache control settings
 */
export interface CacheControlOptions {
  /** Max age in seconds for the resource */
  maxAge?: number;
  /** Whether this is a private resource (not to be cached by shared caches) */
  private?: boolean;
  /** Whether to use stale-while-revalidate */
  staleWhileRevalidate?: number;
  /** Whether to completely disable caching */
  noStore?: boolean;
  /** Whether to include the ETag header */
  useETag?: boolean;
}

/**
 * Default cache settings
 */
const DEFAULT_CACHE_OPTIONS: CacheControlOptions = {
  maxAge: 60, // 1 minute
  private: true,
  staleWhileRevalidate: 300, // 5 minutes
  useETag: true,
};

/**
 * Generate cache control headers based on provided options
 */
export function generateCacheControlHeaders(
  options: CacheControlOptions = {}
): Record<string, string> {
  const opts = { ...DEFAULT_CACHE_OPTIONS, ...options };
  const headers: Record<string, string> = {};

  if (opts.noStore) {
    headers["Cache-Control"] =
      "no-store, no-cache, must-revalidate, proxy-revalidate";
    headers["Pragma"] = "no-cache";
    headers["Expires"] = "0";
    return headers;
  }

  // Build cache-control directive
  let cacheControl = opts.private ? "private, " : "public, ";
  cacheControl += `max-age=${opts.maxAge}`;

  if (opts.staleWhileRevalidate) {
    cacheControl += `, stale-while-revalidate=${opts.staleWhileRevalidate}`;
  }

  headers["Cache-Control"] = cacheControl;

  return headers;
}

/**
 * Add appropriate cache headers to a NextResponse based on options
 */
export function addCacheHeaders<T>(
  response: NextResponse<T>,
  options: CacheControlOptions = {}
): NextResponse<T> {
  const headers = generateCacheControlHeaders(options);

  // Apply headers to response
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Add ETag if requested
  if (options.useETag !== false) {
    const etagValue = `"${Date.now().toString(36)}"`;
    response.headers.set("ETag", etagValue);
  }

  return response;
}

/**
 * Create a response with appropriate cache headers
 */
export function createCachedResponse<T>(
  data: T,
  options: CacheControlOptions = {}
): NextResponse<T> {
  const response = NextResponse.json(data);
  return addCacheHeaders(response, options);
}

/**
 * Helper to create a response for static resources (longer cache time)
 */
export function createStaticResponse<T>(data: T): NextResponse<T> {
  return createCachedResponse(data, {
    maxAge: 3600, // 1 hour
    staleWhileRevalidate: 86400, // 24 hours
    private: false,
  });
}

/**
 * Helper to create a response for dynamic resources (shorter cache time)
 */
export function createDynamicResponse<T>(data: T): NextResponse<T> {
  return createCachedResponse(data, {
    maxAge: 60, // 1 minute
    staleWhileRevalidate: 300, // 5 minutes
    private: true,
  });
}

/**
 * Helper to create a response for uncacheable resources
 */
export function createUncacheableResponse<T>(data: T): NextResponse<T> {
  return createCachedResponse(data, {
    noStore: true,
  });
}
