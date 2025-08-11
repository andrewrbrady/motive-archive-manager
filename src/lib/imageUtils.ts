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

  // Cloudflare Images (imagedelivery.net) — prefer flexible params over named variants
  if (baseUrl.includes("imagedelivery.net")) {
    // Extract base: https://imagedelivery.net/{account}/{imageId}
    const match = baseUrl.match(
      /^(https:\/\/imagedelivery\.net\/[^\/]+\/[^\/]+)/
    );
    const baseWithId = match ? match[1] : baseUrl;

    const params: string[] = [];
    if (width && width.trim() !== "") params.push(`w=${parseInt(width, 10)}`);
    if (quality && quality.trim() !== "")
      params.push(`q=${parseInt(quality, 10)}`);

    // If no params requested, default to reliable public variant
    if (params.length === 0) {
      return `${baseWithId}/public`;
    }

    // Use flexible resizing params to avoid 404s from missing named variants
    return `${baseWithId}/${params.join(",")}`;
  }

  // Non-Cloudflare URLs — return as-is
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

/**
 * Normalize image URL to medium variant for consistent gallery display
 * This is the primary function for gallery image URL normalization
 * @param baseUrl - The original image URL
 * @returns URL normalized to medium variant with debugging logs
 */
export function getMediumVariantUrl(baseUrl: string): string {
  // Normalize to a 600px wide, q=90 flexible transform for Cloudflare Images
  return getEnhancedImageUrl(
    baseUrl,
    IMAGE_SIZES.medium.width,
    IMAGE_SIZES.medium.quality
  );
}
