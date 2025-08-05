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

  // Handle Cloudflare URLs
  if (url.includes("imagedelivery.net")) {
    // List of all known Cloudflare variants
    const variants = [
      "/public",
      "/thumbnail",
      "/medium",
      "/large",
      "/highres",
      "/small",
      "/avatar",
      "/webp",
      "/preview",
      "/original",
    ];

    // Check if URL already has a variant
    const hasVariant = variants.some((variant) => url.includes(variant));

    if (!hasVariant) {
      // No variant found, add /public
      result = `${url}/public`;
    } else {
      // Already has a variant, but check for malformed double variants
      let cleanUrl = url;

      // Remove any trailing variants that might be duplicated
      // This handles cases like "/small/public" by cleaning them up
      const variantPattern = new RegExp(
        `(${variants.map((v) => v.replace("/", "\\/")).join("|")})(${variants.map((v) => v.replace("/", "\\/")).join("|")})+$`
      );

      if (variantPattern.test(url)) {
        // Remove all trailing variants and add /public
        const baseUrlMatch = url.match(
          /^(https:\/\/imagedelivery\.net\/[^\/]+\/[^\/]+)/
        );
        if (baseUrlMatch) {
          cleanUrl = `${baseUrlMatch[1]}/public`;
        }
      }

      result = cleanUrl;
    }
  } else {
    // Return as-is for non-Cloudflare URLs
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
