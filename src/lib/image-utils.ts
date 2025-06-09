/**
 * Simple utility to fix Cloudflare image URLs for serving
 * Replaces the overly complex getFormattedImageUrl approach
 * PERFORMANCE OPTIMIZATION: Added cache to prevent repeated URL processing
 */

// Cache for processed URLs to avoid repeated computation
const urlCache = new Map<string, string>();

// Clear cache immediately to ensure fixes take effect
urlCache.clear();

export function fixCloudflareImageUrl(url: string | null | undefined): string {
  // Handle null/undefined/empty
  if (!url || url.trim() === "") {
    return "https://placehold.co/600x400?text=No+Image";
  }

  // Check cache first for performance optimization
  const cacheKey = url.trim();
  if (urlCache.has(cacheKey)) {
    return urlCache.get(cacheKey)!;
  }

  let result: string;

  // If it's a Cloudflare URL and doesn't have any variant, add /public
  if (
    url.includes("imagedelivery.net") &&
    !url.includes("/public") &&
    !url.includes("/thumbnail") &&
    !url.includes("/medium") &&
    !url.includes("/large") &&
    !url.includes("/highres")
  ) {
    result = `${url}/public`;
  } else {
    // Return as-is for non-Cloudflare URLs or URLs that already have variants
    result = url;
  }

  // Cache the result for future use (limit cache size to prevent memory leaks)
  if (urlCache.size > 1000) {
    // Clear oldest entries if cache gets too large
    const firstKey = urlCache.keys().next().value;
    if (firstKey) {
      urlCache.delete(firstKey);
    }
  }
  urlCache.set(cacheKey, result);

  return result;
}

/**
 * Batch fix function for arrays of objects with image URLs
 * Useful for API responses with multiple images
 * PERFORMANCE OPTIMIZATION: Leverages the cached fixCloudflareImageUrl function
 */
export function fixImageUrlsInObjects<T extends Record<string, any>>(
  objects: T[],
  urlFields: string[]
): T[] {
  return objects.map((obj) => {
    const fixed = { ...obj } as T;

    urlFields.forEach((field) => {
      if (obj[field]) {
        (fixed as any)[field] = fixCloudflareImageUrl(obj[field]);
      }
    });

    return fixed;
  });
}

/**
 * Clear the URL cache - useful for testing or if memory usage becomes a concern
 */
export function clearImageUrlCache(): void {
  urlCache.clear();
}
