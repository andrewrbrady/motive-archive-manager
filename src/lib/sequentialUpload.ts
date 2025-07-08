/**
 * Sequential upload utility for handling multiple large files on Vercel
 * Uploads files one at a time to avoid hitting function payload limits
 */

export interface SequentialUploadOptions {
  endpoint: string;
  carId?: string;
  metadata?: Record<string, any>;
  onProgress?: (
    fileIndex: number,
    totalFiles: number,
    progress: number
  ) => void;
  onFileComplete?: (result: any, fileIndex: number) => void;
  onError?: (error: Error, fileIndex: number, fileName: string) => void;
}

export interface UploadResult {
  success: boolean;
  results: any[];
  errors: Array<{ fileIndex: number; fileName: string; error: string }>;
}

/**
 * Uploads files sequentially to avoid payload size limits
 */
export async function uploadFilesSequentially(
  files: File[],
  options: SequentialUploadOptions
): Promise<UploadResult> {
  const {
    endpoint,
    carId,
    metadata = {},
    onProgress,
    onFileComplete,
    onError,
  } = options;

  const results: any[] = [];
  const errors: Array<{ fileIndex: number; fileName: string; error: string }> =
    [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    try {
      onProgress?.(i + 1, files.length, 0);

      // Create FormData for single file
      const formData = new FormData();
      formData.append("files", file);
      formData.append("metadata", JSON.stringify(metadata));

      if (carId) {
        formData.append("carId", carId);
      }

      // Upload single file
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      onProgress?.(i + 1, files.length, 50);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed (${response.status}): ${errorText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Upload failed");
      }

      onProgress?.(i + 1, files.length, 100);
      onFileComplete?.(result, i);
      results.push(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`Failed to upload file ${file.name}:`, errorMessage);

      errors.push({
        fileIndex: i,
        fileName: file.name,
        error: errorMessage,
      });

      onError?.(
        error instanceof Error ? error : new Error(errorMessage),
        i,
        file.name
      );
    }
  }

  return {
    success: errors.length === 0,
    results,
    errors,
  };
}

/**
 * Checks if files should be uploaded sequentially based on total size
 */
export function shouldUseSequentialUpload(
  files: File[],
  maxBatchSize: number = 20 * 1024 * 1024
): boolean {
  const totalSize = files.reduce((acc, file) => acc + file.size, 0);
  return totalSize > maxBatchSize || files.length > 5;
}
