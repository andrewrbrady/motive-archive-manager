import { analyzeImage } from "./imageAnalyzer";
import { batchProcess } from "./utils";

export interface UploadProgressCallback {
  (
    fileId: string,
    progress: number,
    status: "uploading" | "analyzing" | "complete" | "error",
    error?: string
  ): void;
  (overallProgress: number): void;
}

export interface ImageUploadOptions {
  /**
   * Maximum number of concurrent uploads (default: 3)
   */
  concurrency?: number;
  /**
   * Whether to analyze images after upload (default: true)
   */
  analyze?: boolean;
  /**
   * Additional form data to include with each upload
   */
  additionalFormData?: Record<string, string>;
}

/**
 * Handle uploading multiple images with progress tracking and parallel processing
 */
export async function handleImageUploads(
  files: File[],
  onProgress: UploadProgressCallback,
  uploadEndpoint: string,
  options: ImageUploadOptions = {}
) {
  const { concurrency = 3, analyze = true, additionalFormData = {} } = options;

  const totalFiles = files.length;
  let completedFiles = 0;

  const updateOverallProgress = () => {
    const overallProgress = (completedFiles / totalFiles) * 100;
    onProgress(overallProgress);
  };

  // Process each file upload
  const processFile = async (file: File, index: number) => {
    const fileId = Math.random().toString(36).substr(2, 9);

    try {
      // Start upload
      onProgress(fileId, 0, "uploading");

      // Create FormData for file upload
      const formData = new FormData();
      formData.append("file", file);

      // Add any additional form data
      Object.entries(additionalFormData).forEach(([key, value]) => {
        formData.append(key, value);
      });

      // Upload the file
      const uploadResponse = await fetch(uploadEndpoint, {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      const { url } = await uploadResponse.json();

      let metadata = {};

      if (analyze) {
        onProgress(fileId, 50, "analyzing");
        // Analyze the uploaded image
        metadata = await analyzeImage(url);
      }

      // Update progress to complete
      onProgress(fileId, 100, "complete");
      completedFiles++;
      updateOverallProgress();

      return {
        url,
        metadata: {
          ...metadata,
          filename: file.name,
        },
      };
    } catch (error) {
      onProgress(
        fileId,
        0,
        "error",
        error instanceof Error ? error.message : "Upload failed"
      );
      completedFiles++; // Still count as completed for overall progress
      updateOverallProgress();
      throw error;
    }
  };

  // Use batch processing to control concurrency
  return batchProcess(files, concurrency, processFile);
}
