import { getCache, setCache } from "./cache";

export interface ImageMetadata {
  angle?: string;
  description?: string;
  movement?: string;
  tod?: string;
  view?: string;
  side?: string;
  aiAnalysis?: {
    angle?: string;
    description?: string;
    movement?: string;
    tod?: string;
    view?: string;
    side?: string;
  };
}

interface CloudflareImageResponse {
  result: {
    id: string;
    filename: string;
    meta: ImageMetadata;
    uploaded: string;
    variants: string[];
  };
  success: boolean;
  errors?: Array<{ code: number; message: string }>;
  messages?: Array<{ code: number; message: string }>;
}

export async function getCloudflareImageMetadata(
  imageId: string
): Promise<ImageMetadata | null> {
  try {
    // Check cache first
    const cachedMetadata = getCache<ImageMetadata>(imageId);
    if (cachedMetadata) {
      return cachedMetadata;
    }

    // If not in cache, fetch from API
    const response = await fetch(`/api/cloudflare/metadata/${imageId}`);

    if (!response.ok) {
      console.error(
        "Failed to fetch Cloudflare image metadata:",
        await response.text()
      );
      return null;
    }

    const data: CloudflareImageResponse = await response.json();

    if (!data.success) {
      console.error("Cloudflare API error:", data.errors);
      return null;
    }

    // Cache the metadata before returning
    setCache(imageId, data.result.meta);
    return data.result.meta;
  } catch (error) {
    console.error("Error fetching Cloudflare image metadata:", error);
    return null;
  }
}

export async function updateCloudflareImageMetadata(
  imageId: string,
  metadata: ImageMetadata
): Promise<boolean> {
  try {
    const response = await fetch(`/api/cloudflare/metadata/${imageId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ metadata }),
    });

    if (!response.ok) {
      console.error(
        "Failed to update Cloudflare image metadata:",
        await response.text()
      );
      return false;
    }

    const data = await response.json();
    if (data.success) {
      // Update cache with new metadata
      setCache(imageId, metadata);
    }
    return data.success;
  } catch (error) {
    console.error("Error updating Cloudflare image metadata:", error);
    return false;
  }
}

export async function deleteCloudflareImageMetadata(
  imageId: string,
  key: string
): Promise<boolean> {
  try {
    const currentMetadata = await getCloudflareImageMetadata(imageId);
    if (!currentMetadata) return false;

    const updatedMetadata = { ...currentMetadata };
    delete updatedMetadata[key];

    const success = await updateCloudflareImageMetadata(
      imageId,
      updatedMetadata
    );
    if (success) {
      // Update cache with new metadata
      setCache(imageId, updatedMetadata);
    }
    return success;
  } catch (error) {
    console.error("Error deleting Cloudflare image metadata:", error);
    return false;
  }
}

// Helper function to extract image ID from Cloudflare URL
export function extractImageIdFromUrl(url: string): string | null {
  // Example URL: https://imagedelivery.net/MTt4OTd0b0w5aj/107b9558-dd06-4bbd-5fef-9c2c16bb7900/thumbnail
  const match = url.match(/\/([^\/]+)\/[^\/]+$/);
  return match ? match[1] : null;
}
