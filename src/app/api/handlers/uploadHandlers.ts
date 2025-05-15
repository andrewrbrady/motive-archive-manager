// Define ImageData interface locally since it's not exported from a central types file
interface ImageData {
  _id: string;
  url: string;
  metadata?: {
    category?: string;
    description?: string;
    angle?: string;
    view?: string;
    movement?: string;
    tod?: string;
    side?: string;
    isPrimary?: boolean;
    [key: string]: any;
  };
  filename?: string;
}

import {
  handleImageUploads,
  UploadProgressCallback,
} from "@/lib/imageUploadHandler";

/**
 * Example implementation of an upload handler for the CarImageGalleryV2 component
 * This function demonstrates parallel uploading of multiple files
 */
export async function handleCarImageUpload(
  files: File[],
  carId: string,
  onProgress?: (
    fileId: string,
    progress: number,
    status: string,
    error?: string
  ) => void
): Promise<ImageData[]> {
  // Create a progress callback to handle both individual file progress and overall progress
  const progressCallback: UploadProgressCallback = function (
    fileIdOrProgress: string | number,
    progress?: number,
    status?: "uploading" | "analyzing" | "complete" | "error",
    error?: string
  ) {
    // If first parameter is a string, it's a file ID
    if (
      typeof fileIdOrProgress === "string" &&
      progress !== undefined &&
      status &&
      onProgress
    ) {
      onProgress(fileIdOrProgress, progress, status, error);
    }
    // If first parameter is a number, it's overall progress (ignore for this example)
  };

  try {
    // Use the enhanced image upload handler with parallel processing
    const uploadResults = await handleImageUploads(
      files,
      progressCallback,
      "/api/cars/images/upload", // Replace with your actual endpoint
      {
        concurrency: 3, // Process 3 files at a time
        analyze: true, // Perform image analysis
        additionalFormData: {
          carId: carId,
        },
      }
    );

    // Process and return the results
    return uploadResults.map((result) => ({
      _id: Math.random().toString(36).substring(2, 15),
      url: result.url,
      metadata: result.metadata,
      filename: result.metadata.filename,
    }));
  } catch (error) {
    console.error("Failed to upload images:", error);
    throw error;
  }
}

/**
 * Example of how to use the above handler in a component
 *
 * ```jsx
 * // In your component file:
 * const onUpload = async (files: File[]) => {
 *   try {
 *     // Define a progress tracking function
 *     const trackProgress = (
 *       fileId: string,
 *       progress: number,
 *       status: string,
 *       error?: string
 *     ) => {
 *       // Update your component's progress state
 *       setUploadProgress(prev => [...prev, { fileId, progress, status, error }]);
 *     };
 *
 *     // Call the upload handler with progress tracking
 *     const uploadedImages = await handleCarImageUpload(
 *       files,
 *       carId,
 *       trackProgress
 *     );
 *
 *     // Update your component's state with the new images
 *     setImages(prev => [...prev, ...uploadedImages]);
 *   } catch (error) {
 *     console.error("Upload failed:", error);
 *     // Handle errors appropriately
 *   }
 * };
 *
 * // Use in your JSX
 * <CarImageGalleryV2
 *   images={images}
 *   onUpload={onUpload}
 *   // ... other props
 * />
 * ```
 */
