/**
 * Centralized image URL transformation utilities
 * Replaces scattered getEnhancedImageUrl functions across components
 */

/**
 * Transform Cloudflare image URL with width and quality parameters
 * @param baseUrl - The original image URL
 * @param width - Desired width parameter
 * @param quality - Desired quality parameter
 * @returns Transformed URL with parameters
 */
export function getEnhancedImageUrl(
  baseUrl: string,
  width?: string,
  quality?: string
): string {
  // Early return for empty or invalid URLs
  if (!baseUrl || typeof baseUrl !== "string") {
    return baseUrl || "";
  }

  let params = [];
  // Always check for truthy values and non-empty strings
  if (width && width.trim() !== "") params.push(`w=${width}`);
  if (quality && quality.trim() !== "") params.push(`q=${quality}`);

  if (params.length === 0) return baseUrl;

  // Handle different Cloudflare URL formats
  // Format: https://imagedelivery.net/account/image-id/public
  // Should become: https://imagedelivery.net/account/image-id/w=1600,q=90
  if (baseUrl.includes("imagedelivery.net")) {
    // Check if URL already has transformations (contains variant like 'public')
    if (baseUrl.endsWith("/public") || baseUrl.match(/\/[a-zA-Z]+$/)) {
      // Replace the last segment (usually 'public') with our parameters
      const urlParts = baseUrl.split("/");
      urlParts[urlParts.length - 1] = params.join(",");
      return urlParts.join("/");
    } else {
      // URL doesn't have a variant, append transformations
      return `${baseUrl}/${params.join(",")}`;
    }
  }

  // Fallback for other URL formats - try to replace /public if it exists
  return baseUrl.replace(/\/public$/, `/${params.join(",")}`);
}

/**
 * Memoized version of getEnhancedImageUrl for use in React components
 * Use this in useCallback/useMemo to prevent unnecessary re-computations
 */
export const memoizedGetEnhancedImageUrl = (
  baseUrl: string,
  width?: string,
  quality?: string
) => {
  // Create a stable cache key
  const cacheKey = `${baseUrl}|${width || ""}|${quality || ""}`;

  // Simple memoization for the same parameters
  if (typeof window !== "undefined") {
    // @ts-ignore - Simple cache on window object
    window.__imageUrlCache = window.__imageUrlCache || new Map();
    // @ts-ignore
    if (window.__imageUrlCache.has(cacheKey)) {
      // @ts-ignore
      return window.__imageUrlCache.get(cacheKey);
    }

    const result = getEnhancedImageUrl(baseUrl, width, quality);
    // @ts-ignore
    window.__imageUrlCache.set(cacheKey, result);
    return result;
  }

  return getEnhancedImageUrl(baseUrl, width, quality);
};

/**
 * Common image size presets for consistent usage across the app
 */
export const IMAGE_SIZES = {
  thumbnail: { width: "400", quality: "85" },
  medium: { width: "800", quality: "90" },
  large: { width: "1200", quality: "90" },
  fullsize: { width: "1600", quality: "90" },
  viewer: { width: "2000", quality: "90" },
} as const;

/**
 * Get enhanced URL using predefined size preset
 */
export function getEnhancedImageUrlBySize(
  baseUrl: string,
  size: keyof typeof IMAGE_SIZES
): string {
  const preset = IMAGE_SIZES[size];
  return getEnhancedImageUrl(baseUrl, preset.width, preset.quality);
}
