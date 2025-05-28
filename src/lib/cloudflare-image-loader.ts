export interface CloudflareImageLoaderProps {
  src: string;
  width: number;
  quality?: number;
}

export function cloudflareImageLoader({
  src,
  width,
  quality = 85,
}: CloudflareImageLoaderProps): string {
  // For Cloudflare Images URLs, we should NOT transform them further
  // since they already use named variants like "public", "thumbnail", etc.
  if (
    src.includes("imagedelivery.net") ||
    src.includes("cloudflareimages.com")
  ) {
    // Return the URL as-is since it's already optimized by Cloudflare
    return src;
  }

  // For non-Cloudflare URLs, return as-is (Next.js will handle them)
  return src;
}

// Default export required by Next.js for custom image loaders
export default cloudflareImageLoader;

function extractCloudflareImageId(url: string): string | null {
  // Extract image ID from various Cloudflare Images URL formats
  const patterns = [
    /imagedelivery\.net\/[^\/]+\/([^\/]+)/,
    /cloudflareimages\.com\/[^\/]+\/([^\/]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      // Remove any variant suffix (e.g., /public, /thumbnail)
      const imageId = match[1].split("/")[0];
      return imageId;
    }
  }

  return null;
}

// Predefined variants that match your existing system
export const CLOUDFLARE_VARIANTS = {
  thumbnail: "thumbnail",
  medium: "medium",
  large: "large",
  hero: "public", // Use "public" for hero images (original quality)
  // Additional variants for specific use cases
  square: "thumbnail", // Map to existing thumbnail variant
  wide: "medium", // Map to existing medium variant
  gallery: "thumbnail", // Map to existing thumbnail variant
  public: "public", // Original image
} as const;

export function getCloudflareImageUrl(
  imageId: string,
  variant: keyof typeof CLOUDFLARE_VARIANTS = "medium"
): string {
  const accountId = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID;
  if (!accountId) {
    console.warn("NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID not configured");
    return imageId; // Fallback to original
  }

  const cloudflareVariant = CLOUDFLARE_VARIANTS[variant];
  return `https://imagedelivery.net/${accountId}/${imageId}/${cloudflareVariant}`;
}

// Helper function to check if a URL is a Cloudflare Images URL
export function isCloudflareImageUrl(url: string): boolean {
  return (
    url.includes("imagedelivery.net") || url.includes("cloudflareimages.com")
  );
}

// Helper function to get the base Cloudflare Images URL without variants
export function getCloudflareImageBaseUrl(imageId: string): string {
  const accountId = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID;
  if (!accountId) {
    console.warn("NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID not configured");
    return imageId;
  }

  return `https://imagedelivery.net/${accountId}/${imageId}`;
}

// Helper function to create responsive srcSet for Cloudflare Images
// This uses your existing named variants instead of flexible variants
export function createCloudflareImageSrcSet(
  imageId: string,
  variants: (keyof typeof CLOUDFLARE_VARIANTS)[] = [
    "thumbnail",
    "medium",
    "large",
  ]
): string {
  const accountId = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID;
  if (!accountId) {
    console.warn("NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID not configured");
    return "";
  }

  // Map variants to approximate widths for srcset
  const variantWidths = {
    thumbnail: 200,
    medium: 600,
    large: 1200,
    hero: 1920,
    square: 200,
    wide: 800,
    gallery: 300,
    public: 1920,
  };

  return variants
    .map((variant) => {
      const cloudflareVariant = CLOUDFLARE_VARIANTS[variant];
      const width = variantWidths[variant];
      return `https://imagedelivery.net/${accountId}/${imageId}/${cloudflareVariant} ${width}w`;
    })
    .join(", ");
}
