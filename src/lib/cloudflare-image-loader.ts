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
  // If it's already a Cloudflare Images URL, use it directly with transformations
  if (
    src.includes("imagedelivery.net") ||
    src.includes("cloudflareimages.com")
  ) {
    // Extract the image ID from Cloudflare Images URL
    const imageId = extractCloudflareImageId(src);
    if (imageId) {
      const accountHash = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH;
      if (!accountHash) {
        console.warn("NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH not configured");
        return src; // Fallback to original URL
      }
      return `https://imagedelivery.net/${accountHash}/${imageId}/w=${width},q=${quality}`;
    }
  }

  // For external URLs or non-Cloudflare URLs, return as-is
  // In production, you might want to upload these to Cloudflare Images first
  return src;
}

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

// Predefined variants for common use cases
export const CLOUDFLARE_VARIANTS = {
  thumbnail: "w=200,h=150,fit=cover,q=85",
  medium: "w=600,h=400,fit=cover,q=90",
  large: "w=1200,h=800,fit=cover,q=95",
  hero: "w=1920,h=1080,fit=cover,q=95",
  // Additional variants for specific use cases
  square: "w=400,h=400,fit=cover,q=90",
  wide: "w=800,h=450,fit=cover,q=90",
  gallery: "w=300,h=200,fit=cover,q=85",
} as const;

export function getCloudflareImageUrl(
  imageId: string,
  variant: keyof typeof CLOUDFLARE_VARIANTS = "medium"
): string {
  const accountHash = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH;
  if (!accountHash) {
    console.warn("NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH not configured");
    return imageId; // Fallback to original
  }

  return `https://imagedelivery.net/${accountHash}/${imageId}/${CLOUDFLARE_VARIANTS[variant]}`;
}

// Helper function to check if a URL is a Cloudflare Images URL
export function isCloudflareImageUrl(url: string): boolean {
  return (
    url.includes("imagedelivery.net") || url.includes("cloudflareimages.com")
  );
}

// Helper function to get the base Cloudflare Images URL without variants
export function getCloudflareImageBaseUrl(imageId: string): string {
  const accountHash = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH;
  if (!accountHash) {
    console.warn("NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH not configured");
    return imageId;
  }

  return `https://imagedelivery.net/${accountHash}/${imageId}`;
}

// Helper function to create responsive srcSet for Cloudflare Images
export function createCloudflareImageSrcSet(
  imageId: string,
  sizes: number[] = [400, 600, 800, 1200],
  quality: number = 90
): string {
  const accountHash = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH;
  if (!accountHash) {
    console.warn("NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH not configured");
    return "";
  }

  return sizes
    .map(
      (size) =>
        `https://imagedelivery.net/${accountHash}/${imageId}/w=${size},q=${quality} ${size}w`
    )
    .join(", ");
}
