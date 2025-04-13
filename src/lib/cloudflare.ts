import { getCache, setCache } from "./cache";
import { AIImageAnalysis } from "@/types/car";
import path from "path";

export interface ImageMetadata {
  angle?: string;
  description?: string;
  movement?: string;
  tod?: string;
  view?: string;
  side?: string;
  aiAnalysis?: AIImageAnalysis;
  [key: string]:
    | string
    | { [key: string]: string | undefined }
    | AIImageAnalysis
    | undefined;
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

interface CloudflareImageUploadResult {
  id: string;
  filename: string;
  uploaded: string;
  requireSignedURLs: boolean;
  variants: string[];
  url: string;
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

export async function uploadToCloudflare(
  file: File
): Promise<CloudflareImageUploadResult> {
  console.log("Starting Cloudflare upload:", {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
  });

  const formData = new FormData();
  formData.append("file", file);
  formData.append("itemId", "inventory-item"); // Add a default itemId that the endpoint requires

  try {
    console.log("Sending request to /api/upload");
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      // Try to parse error response
      const errorData = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      console.error("Upload failed:", {
        status: response.status,
        statusText: response.statusText,
        errorData,
      });
      throw new Error(
        `Failed to upload image to Cloudflare: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();
    console.log("Upload response:", result);

    // Extract image ID either from result.id or from imageUrl path
    const imageId =
      result.id || (result.imageUrl ? path.basename(result.imageUrl) : null);

    if (!imageId) {
      throw new Error("Failed to get image ID from upload response");
    }

    // Handle both direct imageUrl response and Cloudflare account ID based response
    const baseUrl = result.imageUrl
      ? result.imageUrl.replace(/\/[^\/]+$/, "") // Remove the last part of the URL (filename)
      : `https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/${imageId}`;

    // Ensure the URL is properly constructed with /public at the end
    const imageUrl = result.imageUrl || `${baseUrl}/public`;

    console.log("Final image URL:", imageUrl);

    return {
      id: imageId,
      filename: result.filename || file.name,
      uploaded: result.uploaded || new Date().toISOString(),
      requireSignedURLs: result.requireSignedURLs || false,
      url: imageUrl,
      variants:
        result.variants ||
        ["public", "thumbnail"].map((variant) => `${baseUrl}/${variant}`),
    };
  } catch (error) {
    console.error("Error during upload:", error);
    throw error;
  }
}

/**
 * Format a Cloudflare Images URL to ensure it has the correct variant suffix
 * @param url The base Cloudflare image URL
 * @param variant The variant to use (defaults to 'public')
 * @returns Properly formatted Cloudflare image URL
 */
export function getFormattedImageUrl(
  url: string | null | undefined,
  variant: string = "public"
): string {
  if (!url) {
    return ""; // Return empty string for null/undefined URLs
  }

  try {
    // Check if it's a Cloudflare Images URL
    if (!url.includes("imagedelivery.net")) {
      return url; // Return as-is if not a Cloudflare URL
    }

    // Remove any existing variant and trailing slashes
    const baseUrl = url.replace(
      /\/(public|thumbnail|avatar|medium|large)(\/)?$/,
      ""
    );

    // Ensure the URL is properly formed
    if (!baseUrl.match(/^https:\/\/imagedelivery\.net\/[^\/]+\/[^\/]+$/)) {
      console.error("[Cloudflare] Malformed image URL:", url);
      return url;
    }

    // Add the requested variant
    return `${baseUrl}/${variant}`;
  } catch (error) {
    console.error("[Cloudflare] Error formatting image URL:", error);
    return url;
  }
}

/**
 * Get a car's thumbnail URL from its data
 * This provides a consistent way to get a car's thumbnail across the application
 * @param car The car object containing primaryImageId and images
 * @returns The formatted URL for the car's thumbnail
 */
export function getCarThumbnailUrl(car: any): string {
  try {
    if (!car) {
      console.warn("No car data provided to getCarThumbnailUrl");
      return "";
    }

    // 1. Check if car has both primaryImageId and images array
    if (car.primaryImageId && car.images && car.images.length > 0) {
      // Find the primary image by comparing string representations of IDs
      const primaryImage = car.images.find((img: any) => {
        const imgId =
          typeof img._id === "string" ? img._id : img._id?.toString();
        const primaryId =
          typeof car.primaryImageId === "string"
            ? car.primaryImageId
            : car.primaryImageId?.toString();

        return imgId === primaryId;
      });

      // If primary image found and has a URL, return it
      if (primaryImage?.url) {
        return getFormattedImageUrl(primaryImage.url, "public");
      }
    }

    // 2. Fall back to first image in the images array if available
    if (car.images && car.images.length > 0 && car.images[0]?.url) {
      return getFormattedImageUrl(car.images[0].url, "public");
    }

    // 3. Return empty string if no valid images found
    return "";
  } catch (error) {
    console.error("Error getting car thumbnail URL:", error);
    return "";
  }
}

/**
 * Generate a placeholder image URL for missing images
 * This can be used when we have imageIds but no actual image data
 */
export function getPlaceholderImageUrl(imageId: string): string {
  // Return a placeholder image URL that shows the image is loading
  // The format is deliberately compatible with getFormattedImageUrl
  return `https://placehold.co/800x600/d1d5db/6b7280?text=Loading...`;
}

/**
 * Fetch an image directly from the images collection by ID
 * @param imageId The ID of the image to fetch
 * @returns Promise that resolves to the image URL
 */
export async function fetchImageById(imageId: string): Promise<string> {
  try {
    // If no imageId provided, return empty string
    if (!imageId) {
      return "";
    }

    // Make API call to get image by ID
    const response = await fetch(`/api/images/${imageId}`);

    if (!response.ok) {
      console.error(`Failed to fetch image ${imageId}:`, response.statusText);
      return "";
    }

    const data = await response.json();

    // The API already returns a formatted URL
    if (data && data.url) {
      return data.url;
    }

    console.error("Invalid image data returned:", data);
    return "";
  } catch (error) {
    console.error(`Error fetching image ${imageId}:`, error);
    return "";
  }
}
