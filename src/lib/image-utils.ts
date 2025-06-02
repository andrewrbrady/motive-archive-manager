/**
 * Simple utility to fix Cloudflare image URLs for serving
 * Replaces the overly complex getFormattedImageUrl approach
 */

export function fixCloudflareImageUrl(url: string | null | undefined): string {
  // Handle null/undefined/empty
  if (!url || url.trim() === "") {
    return "https://placehold.co/600x400?text=No+Image";
  }

  // If it's a Cloudflare URL and doesn't have a variant, add /public
  if (
    url.includes("imagedelivery.net") &&
    !url.includes("/public") &&
    !url.includes("/thumbnail")
  ) {
    return `${url}/public`;
  }

  // Return as-is for non-Cloudflare URLs or URLs that already have variants
  return url;
}

/**
 * Batch fix function for arrays of objects with image URLs
 * Useful for API responses with multiple images
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
