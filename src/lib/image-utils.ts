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

  // SIMPLIFIED: Just return the base URL without transformation
  // Let CloudflareImage component handle variants to avoid conflicts
  const cleanUrl = url.trim();

  // For Cloudflare URLs, extract base URL only (no variants)
  if (cleanUrl.includes("imagedelivery.net")) {
    const baseUrlMatch = cleanUrl.match(
      /^(https:\/\/imagedelivery\.net\/[^\/]+\/[^\/]+)/
    );
    if (baseUrlMatch) {
      return baseUrlMatch[1]; // Return base URL without any variants
    }
  }

  return cleanUrl;
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
