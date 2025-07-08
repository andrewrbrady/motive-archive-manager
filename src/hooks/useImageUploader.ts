import { useRef, useState, useCallback } from "react";
import { nanoid } from "nanoid";
import { useAPI } from "@/hooks/useAPI";
import { getValidToken } from "@/lib/api-client";

interface UploadProgress {
  id: string;
  filename: string;
  progress: number;
  status: "uploading" | "analyzing" | "complete" | "error";
  currentStep: string;
  error?: string;
  lastUpdated: number; // timestamp
}

interface UseImageUploaderOptions {
  carId: string;
  actions: any;
  toast: any;
  concurrentLimit?: number;
  validateFile?: (file: File) => Promise<string | null>;
  resetOnClose?: boolean;
  selectedPromptId?: string;
  selectedModelId?: string;
}

export function useImageUploader({
  carId,
  actions,
  toast,
  concurrentLimit = 3,
  validateFile,
  resetOnClose = false,
  selectedPromptId,
  selectedModelId,
}: UseImageUploaderOptions) {
  // ✅ All hooks must be called before any conditional returns
  const [progress, setProgress] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const api = useAPI();

  // Helper to generate a stable ID for a file
  const getFileId = (file: File) => `${file.name}-${file.lastModified}`;

  // Reset progress when modal is closed (if requested)
  const resetProgress = useCallback(() => {
    setProgress([]);
  }, []);

  // Validate files before upload
  const validateFiles = useCallback(
    async (files: File[]) => {
      const errors: Record<string, string> = {};
      for (const file of files) {
        if (validateFile) {
          const err = await validateFile(file);
          if (err) errors[getFileId(file)] = err;
        } else {
          // Default: check size and type
          if (!file.type.startsWith("image/")) {
            errors[getFileId(file)] = "Invalid file type";
          } else if (file.size > 5 * 1024 * 1024) {
            errors[getFileId(file)] = "File too large (max 5MB)";
          }
        }
      }
      return errors;
    },
    [validateFile]
  );

  // Abort upload
  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsUploading(false);
    setError("Upload cancelled");
  }, []);

  // Main upload function
  const uploadImages = useCallback(
    async (files: File[]) => {
      // ✅ Guard against api being null inside the callback
      if (!api) {
        setError("API not available");
        return;
      }

      setError(null);
      setIsUploading(true);
      abortControllerRef.current = new AbortController();
      const controller = abortControllerRef.current;
      const now = Date.now();

      // Validate files
      const validationErrors = await validateFiles(files);
      if (Object.keys(validationErrors).length > 0) {
        setProgress((prev) => {
          // Only add new error files, don't clear existing progress
          const newProgress = files
            .filter((file) => !prev.some((p) => p.id === getFileId(file)))
            .map((file) => ({
              id: getFileId(file),
              filename: file.name,
              progress: 0,
              status: "error" as const,
              currentStep: "Validation failed",
              error: validationErrors[getFileId(file)],
              lastUpdated: now,
            }));
          return [...prev, ...newProgress];
        });
        setIsUploading(false);
        setError("Some files failed validation");
        return;
      }

      // Add new files to progress, don't replace
      setProgress((prev) => {
        const newProgress = files
          .filter((file) => !prev.some((p) => p.id === getFileId(file)))
          .map((file) => ({
            id: getFileId(file),
            filename: file.name,
            progress: 0,
            status: "uploading" as const,
            currentStep: "Queued",
            lastUpdated: now,
          }));
        return [...prev, ...newProgress];
      });

      // Helper to update progress for a file
      const updateProgress = (file: File, patch: Partial<UploadProgress>) => {
        setProgress((prev) =>
          prev.map((p) => {
            if (p.id !== getFileId(file)) return p;
            // If already complete or error or 100%, do not update further
            if (
              p.status === "complete" ||
              p.status === "error" ||
              p.progress === 100
            ) {
              return p;
            }
            // Map backend status to progress range
            let mappedProgress = patch.progress ?? p.progress;
            let mappedStatus = patch.status ?? p.status;
            if (patch.status === "uploading") {
              mappedProgress = Math.max(
                p.progress,
                Math.min(mappedProgress, 70)
              );
            } else if (patch.status === "analyzing") {
              mappedProgress = Math.max(
                70,
                Math.max(p.progress, Math.min(mappedProgress, 99))
              );
            } else if (patch.status === "complete") {
              mappedProgress = 100;
              mappedStatus = "complete";
            } else if (patch.status === "error") {
              mappedProgress = p.progress;
              mappedStatus = "error";
            }
            mappedProgress = Math.max(p.progress, mappedProgress);
            return {
              ...p,
              ...patch,
              progress: mappedProgress,
              status: mappedStatus,
              lastUpdated: Date.now(),
            };
          })
        );
      };

      // Upload in batches
      const queue = [...files];
      let hasError = false;

      const uploadBatch = async (batch: File[]) => {
        const formData = new FormData();
        batch.forEach((file) => {
          formData.append("files", file);
        });
        formData.append("carId", carId);
        if (selectedPromptId) {
          formData.append("selectedPromptId", selectedPromptId);
        }
        if (selectedModelId) {
          formData.append("selectedModelId", selectedModelId);
        }

        // Mark as uploading
        batch.forEach((file) => {
          updateProgress(file, {
            progress: 10,
            status: "uploading",
            currentStep: "Uploading...",
          });
        });

        try {
          const response = await fetch("/api/images/upload", {
            method: "POST",
            body: formData,
            signal: controller.signal,
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
              errorData.error || `Upload failed: ${response.statusText}`
            );
          }

          const data = await response.json();

          if (!data.success || !data.images || data.images.length === 0) {
            throw new Error(
              data.error || "No images were uploaded successfully"
            );
          }

          // ✅ Now analyze each uploaded image
          for (let i = 0; i < data.images.length; i++) {
            const uploadedImage = data.images[i];
            const file = batch[i];

            try {
              // Update progress to analyzing
              updateProgress(file, {
                progress: 75,
                status: "analyzing",
                currentStep: "Analyzing image with AI...",
              });

              // Call analysis API
              const analysisResponse = await fetch(
                "/api/openai/analyze-image",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    imageUrl: uploadedImage.url,
                    promptId: selectedPromptId,
                    modelId: selectedModelId,
                  }),
                  signal: controller.signal,
                }
              );

              if (analysisResponse.ok) {
                const analysisData = await analysisResponse.json();
                console.log(
                  "✅ Image analysis completed:",
                  analysisData.analysis
                );

                // Update the image metadata in MongoDB
                if (uploadedImage.cloudflareId) {
                  try {
                    await fetch(
                      `/api/cloudflare/metadata/${uploadedImage.cloudflareId}`,
                      {
                        method: "PATCH",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          metadata: {
                            ...uploadedImage.metadata,
                            ...analysisData.analysis,
                            aiAnalysis: analysisData.analysis,
                          },
                        }),
                      }
                    );
                    console.log(
                      "✅ Metadata updated in database for",
                      file.name
                    );
                  } catch (metadataError) {
                    console.warn(
                      "Failed to update metadata in database:",
                      metadataError
                    );
                  }
                }
              } else {
                console.warn("Image analysis failed for", file.name);
              }
            } catch (analysisError) {
              console.error("Error analyzing image:", analysisError);
            }
          }

          // Update progress for successful uploads
          batch.forEach((file, index) => {
            if (data.images[index]) {
              updateProgress(file, {
                progress: 100,
                status: "complete",
                currentStep: "Upload and analysis complete",
              });
            }
          });
        } catch (err: any) {
          if (err.name === "AbortError") {
            batch.forEach((file) => {
              updateProgress(file, {
                status: "error",
                currentStep: "Cancelled",
                error: "Upload cancelled",
              });
            });
            setError("Upload cancelled");
          } else {
            batch.forEach((file) => {
              updateProgress(file, {
                status: "error",
                currentStep: "Failed",
                error: err.message || "Upload failed",
              });
            });
            setError(err.message || "Upload failed");
          }
          hasError = true;
        }
      };

      // Process queue in batches
      while (queue.length > 0 && !controller.signal.aborted) {
        const batch = queue.splice(0, concurrentLimit);
        await uploadBatch(batch);
      }

      // Sync gallery state
      await actions.synchronizeGalleryState();
      setIsUploading(false);
      if (!hasError) {
        toast.success("Upload Complete", {
          description: `Successfully uploaded ${files.length} files`,
        });
      } else {
        toast.error("Upload Failed", {
          description: error || "Some files failed to upload",
        });
      }
    },
    [
      api,
      carId,
      actions,
      toast,
      concurrentLimit,
      validateFiles,
      progress,
      error,
      selectedPromptId,
      selectedModelId,
    ]
  );

  return {
    uploadImages,
    progress,
    isUploading,
    abort,
    error,
    resetProgress, // expose for modal close
  };
}
