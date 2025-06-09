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
  // Centralized URL transformation for named variants

  // Early return for empty or invalid URLs
  if (!baseUrl || typeof baseUrl !== "string") {
    return baseUrl || "";
  }

  // Map requested dimensions to configured named variants
  const getNamedVariant = (requestedWidth?: string) => {
    if (!requestedWidth) return "public";

    const w = parseInt(requestedWidth);
    // Use actual Cloudflare variants:
    // thumbnail: 200x150, medium: 600x400, large: 1200x800, highres: 3000x2000
    if (w <= 200) return "thumbnail";
    if (w <= 600) return "medium";
    if (w <= 1200) return "large";
    return "highres";
  };

  // Handle Cloudflare imagedelivery.net URLs
  if (baseUrl.includes("imagedelivery.net")) {
    const urlParts = baseUrl.split("/");
    const targetVariant = getNamedVariant(width);

    // FIXED: Strip existing variants (including double variants like /large/public)
    // Find the cloudflare ID part (format: account/imageId)
    let cleanUrl = baseUrl;
    if (urlParts.length >= 5) {
      // Extract base: https://imagedelivery.net/account/imageId
      const baseWithId = urlParts.slice(0, 5).join("/");
      cleanUrl = baseWithId;
    }

    // Always append the target variant to the clean URL
    const result = `${cleanUrl}/${targetVariant}`;

    return result;
  }

  // Fallback - just return the base URL with /public if it doesn't have a variant
  if (
    !baseUrl.includes("/public") &&
    !baseUrl.includes("/thumbnail") &&
    !baseUrl.includes("/medium") &&
    !baseUrl.includes("/large") &&
    !baseUrl.includes("/highres")
  ) {
    return `${baseUrl}/public`;
  }

  return baseUrl;
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
  // TEMPORARY: Clear cache to debug double variant issue
  if (typeof window !== "undefined") {
    // @ts-ignore - Clear the cache to ensure fresh results
    window.__imageUrlCache = new Map();
  }

  // Always return fresh result for debugging
  return getEnhancedImageUrl(baseUrl, width, quality);
};

/**
 * Common image size presets aligned with Cloudflare named variants
 */
export const IMAGE_SIZES = {
  thumbnail: { width: "200", quality: "85" }, // Maps to thumbnail variant
  medium: { width: "600", quality: "90" }, // Maps to medium variant
  large: { width: "1200", quality: "90" }, // Maps to large variant
  fullsize: { width: "1366", quality: "90" }, // Maps to public variant
  viewer: { width: "3000", quality: "90" }, // Maps to highres variant
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
