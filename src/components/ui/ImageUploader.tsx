import React, { useRef, useState, useEffect, useCallback } from "react";
import { Upload, Check, X as XIcon, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { IMAGE_ANALYSIS_CONFIG } from "@/constants/image-analysis";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { useAPI } from "@/hooks/useAPI";
import { getValidToken } from "@/lib/api-client";
import { Progress } from "@/components/ui/progress";

type UploadMode = "car" | "general";

interface ImageUploaderProps {
  mode: UploadMode;
  carId?: string; // Required for car mode, optional for general mode
  vehicleInfo?: any; // Only used in car mode
  onComplete?: () => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
  multiple?: boolean;
  metadata?: Record<string, any>; // Custom metadata for general uploads
}

interface ImageProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "analyzing" | "complete" | "error";
  error?: string;
  currentStep?: string;
  imageUrl?: string;
  metadata?: any;
  stepProgress?: {
    cloudflare?: {
      status: string;
      progress: number;
      message?: string;
    };
    openai?: {
      status: string;
      progress: number;
      message?: string;
    };
  };
}

interface ImageAnalysisPrompt {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  isDefault: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  mode,
  carId,
  vehicleInfo,
  onComplete,
  onError,
  onCancel,
  multiple = true,
  metadata = {},
}) => {
  console.log("📸 ImageUploader rendering with mode:", mode, "carId:", carId);
  const api = useAPI();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<ImageProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPromptId, setSelectedPromptId] = useState<string>("");
  const [selectedModelId, setSelectedModelId] = useState<string>(
    IMAGE_ANALYSIS_CONFIG.availableModels.find((m) => m.isDefault)?.id ||
      "gpt-4o-mini"
  );
  const [availablePrompts, setAvailablePrompts] = useState<
    ImageAnalysisPrompt[]
  >([]);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(true);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const { user } = useFirebaseAuth();

  // Store original page title to restore later
  const [originalTitle, setOriginalTitle] = useState<string>("");

  // Create stable callback reference
  const stableOnComplete = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  // Validate required props
  if (mode === "car" && !carId) {
    throw new Error("carId is required when mode is 'car'");
  }

  // Load available prompts on component mount
  useEffect(() => {
    if (!api) return;

    const loadPrompts = async () => {
      try {
        console.log("🔄 Loading AI analysis prompts...");
        const data = (await api.get(
          "admin/image-analysis-prompts/active"
        )) as ImageAnalysisPrompt[];
        console.log("✅ Received prompts data:", data);
        setAvailablePrompts(data || []);

        // Set default prompt if available
        const defaultPrompt = data?.find(
          (p: ImageAnalysisPrompt) => p.isDefault
        );
        if (defaultPrompt) {
          setSelectedPromptId(defaultPrompt._id);
          console.log("✅ Set default prompt:", defaultPrompt.name);
        } else {
          console.log("⚠️ No default prompt found");
        }
      } catch (error) {
        console.error("❌ Failed to load prompts:", error);
      } finally {
        console.log("🏁 Setting isLoadingPrompts to false");
        setIsLoadingPrompts(false);
      }
    };

    loadPrompts();
  }, [api]);

  // Store original title on mount and restore on unmount
  useEffect(() => {
    setOriginalTitle(document.title);
    return () => {
      if (originalTitle) {
        document.title = originalTitle;
      }
    };
  }, [originalTitle]);

  // Handle file selection or drop
  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) {
      console.log("No files provided");
      return;
    }

    console.log("handleFiles called with:", files.length, "files");

    const fileArray = Array.from(files);
    console.log(
      "File array:",
      fileArray.map((f) => ({ name: f.name, size: f.size, type: f.type }))
    );

    // Validate file types
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const invalidFiles = fileArray.filter(
      (file) => !validTypes.includes(file.type)
    );

    if (invalidFiles.length > 0) {
      console.log(
        "Invalid file types found:",
        invalidFiles.map((f) => f.type)
      );
      onError?.(
        `Please select valid image files. Invalid files: ${invalidFiles.map((f) => f.name).join(", ")}`
      );
      return;
    }

    // Check individual file sizes (8MB limit per file)
    const oversizedFiles = fileArray.filter(
      (file) => file.size > 8 * 1024 * 1024
    );

    console.log("Oversized files:", oversizedFiles.length);

    if (oversizedFiles.length > 0) {
      console.log("Calling onError for oversized files");
      onError?.(
        `The following files are too large (over 8MB): ${oversizedFiles.map((f) => f.name).join(", ")}. Please compress them before uploading.`
      );
      return;
    }

    // For large batches, we'll process them in chunks automatically
    const totalSize = fileArray.reduce((acc, file) => acc + file.size, 0);
    console.log("Total size:", (totalSize / 1024 / 1024).toFixed(1), "MB");
    console.log("Will process", fileArray.length, "files in chunks if needed");

    setPendingFiles(fileArray);
    setProgress([]); // Reset progress if new files are selected
  };

  // Create chunks of files for upload
  const createUploadChunks = (files: File[]): File[][] => {
    console.log("=== CHUNK CREATION START ===");
    console.log("Input files:", files.length);
    console.log(
      "Files details:",
      files.map((f) => ({
        name: f.name,
        size: f.size,
        sizeMB: (f.size / 1024 / 1024).toFixed(2) + "MB",
        type: f.type,
      }))
    );

    const chunks: File[][] = [];
    let currentChunk: File[] = [];
    let currentChunkSize = 0;
    const maxChunkSize = 6 * 1024 * 1024; // 6MB per chunk - safely under 8MB backend limit
    const maxFilesPerChunk = 3; // OPTIMIZED: Reduced from 5 to 3 files per chunk for faster processing

    for (const file of files) {
      // Check if adding this file would exceed either limit
      if (
        currentChunk.length > 0 &&
        (currentChunkSize + file.size > maxChunkSize ||
          currentChunk.length >= maxFilesPerChunk)
      ) {
        // Start a new chunk
        chunks.push(currentChunk);
        console.log(
          `Chunk ${chunks.length} created with ${currentChunk.length} files, total size: ${(currentChunkSize / 1024 / 1024).toFixed(2)}MB`
        );
        currentChunk = [];
        currentChunkSize = 0;
      }

      currentChunk.push(file);
      currentChunkSize += file.size;
    }

    // Add the last chunk if it has files
    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
      console.log(
        `Final chunk ${chunks.length} created with ${currentChunk.length} files, total size: ${(currentChunkSize / 1024 / 1024).toFixed(2)}MB`
      );
    }

    console.log(`Created ${chunks.length} chunks from ${files.length} files`);
    console.log(
      "Chunk summary:",
      chunks.map((chunk, i) => ({
        chunkIndex: i + 1,
        fileCount: chunk.length,
        totalSize:
          (chunk.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2) +
          "MB",
      }))
    );
    console.log("=== CHUNK CREATION END ===");

    return chunks;
  };

  // Start the upload process
  const startUpload = async () => {
    if (pendingFiles.length === 0) return;

    // Validate required fields
    if (!selectedPromptId) {
      onError?.("Please select an analysis prompt before uploading.");
      return;
    }

    if (!selectedModelId) {
      onError?.("Please select an AI model before uploading.");
      return;
    }

    console.log("🚀 Starting upload process...");
    console.log("Selected prompt:", selectedPromptId);
    console.log("Selected model:", selectedModelId);
    console.log("Mode:", mode);
    console.log("Car ID:", carId);
    console.log("Files to upload:", pendingFiles.length);
    setIsUploading(true);
    setUploadSuccess(false);

    // Initialize progress for all files
    const initialProgress: ImageProgress[] = pendingFiles.map(
      (file, index) => ({
        fileId: `file-${index}`,
        fileName: file.name,
        progress: 0,
        status: "pending" as const,
        currentStep: "Preparing...",
      })
    );

    setProgress(initialProgress);

    try {
      // Create chunks for upload
      const chunks = createUploadChunks(pendingFiles);
      console.log(`Processing ${chunks.length} chunks`);

      let globalFileIndex = 0;

      // OPTIMIZED: Process chunks in parallel for maximum throughput
      const maxParallelChunks = Math.min(chunks.length, 3); // Limit to 3 parallel chunks to balance speed vs resource usage
      console.log(
        `Processing ${chunks.length} chunks with up to ${maxParallelChunks} parallel chunks`
      );

      // Process chunks in batches of parallel requests
      for (let i = 0; i < chunks.length; i += maxParallelChunks) {
        const chunkBatch = chunks.slice(i, i + maxParallelChunks);

        console.log(
          `Processing chunk batch ${Math.floor(i / maxParallelChunks) + 1} with ${chunkBatch.length} parallel chunks`
        );

        // Process this batch of chunks in parallel
        const chunkPromises = chunkBatch.map((chunk, batchIndex) => {
          const chunkIndex = i + batchIndex;
          const fileOffset = chunks
            .slice(0, chunkIndex)
            .reduce((sum, c) => sum + c.length, 0);

          console.log(
            `Starting parallel processing of chunk ${chunkIndex + 1}/${chunks.length} with ${chunk.length} files`
          );

          return processChunk(
            chunk,
            chunkIndex,
            fileOffset,
            pendingFiles.length
          );
        });

        // Wait for all chunks in this batch to complete
        await Promise.all(chunkPromises);

        // Small delay between chunk batches to prevent server overload
        if (i + maxParallelChunks < chunks.length) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }

      console.log("✅ All chunks processed successfully");
      setUploadSuccess(true);
    } catch (error) {
      console.error("❌ Upload process failed:", error);
      onError?.("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  // Process a single chunk of files
  const processChunk = async (
    chunk: File[],
    chunkIndex: number,
    globalOffset: number,
    totalFiles: number
  ) => {
    console.log(`=== PROCESSING CHUNK ${chunkIndex + 1} ===`);
    console.log(
      "Chunk files:",
      chunk.map((f) => f.name)
    );

    try {
      // Get auth token
      const token = await getValidToken();
      if (!token) {
        throw new Error("Authentication required");
      }

      // Create FormData for this chunk
      const formData = new FormData();

      // Add files to FormData with the expected naming convention
      chunk.forEach((file, index) => {
        formData.append(`file${index}`, file);
        console.log(
          `Added file ${index + 1}: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`
        );
      });

      // Add file count
      formData.append("fileCount", chunk.length.toString());

      // Add metadata
      formData.append("selectedPromptId", selectedPromptId);
      formData.append("selectedModelId", selectedModelId);

      if (mode === "car" && carId) {
        formData.append("carId", carId);
        if (vehicleInfo) {
          formData.append("vehicleInfo", JSON.stringify(vehicleInfo));
        }
      } else {
        // General mode metadata
        formData.append("metadata", JSON.stringify(metadata));
      }

      console.log("FormData prepared, starting fetch...");
      console.log("FormData contents:", {
        selectedPromptId,
        selectedModelId,
        carId: mode === "car" ? carId : "N/A",
        fileCount: chunk.length,
      });

      // Update progress to show upload starting
      chunk.forEach((file, localIndex) => {
        const fileIndex = globalOffset + localIndex;
        setProgress((prev) => {
          const updated = [...prev];
          if (updated[fileIndex]) {
            updated[fileIndex] = {
              ...updated[fileIndex],
              status: "uploading",
              currentStep: "Starting upload...",
            };
          }
          return updated;
        });
      });

      // Make the request with streaming response
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      try {
        const response = await fetch("/api/cloudflare/images", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        console.log("Response received:", {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries()),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Upload request failed:", {
            status: response.status,
            statusText: response.statusText,
            error: errorText,
          });
          throw new Error(
            `Upload failed: ${response.status} ${response.statusText} - ${errorText}`
          );
        }

        if (!response.body) {
          throw new Error("No response body received");
        }

        console.log("✅ Upload request successful, processing stream...");

        // Process the streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              console.log("✅ Stream processing complete");
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.trim() === "") continue;

              try {
                // Handle Server-Sent Events format
                let jsonData;
                if (line.startsWith("data: ")) {
                  const jsonString = line.substring(6); // Remove "data: " prefix
                  jsonData = JSON.parse(jsonString);
                } else {
                  jsonData = JSON.parse(line);
                }

                console.log("📦 Received stream data:", jsonData);
                const data = jsonData;

                if (data.type === "progress") {
                  // Update progress for the specific file
                  const fileIndex = globalOffset + data.fileIndex;
                  setProgress((prev) => {
                    const updated = [...prev];
                    if (updated[fileIndex]) {
                      updated[fileIndex] = {
                        ...updated[fileIndex],
                        progress: data.progress,
                        status: data.status,
                        currentStep: data.message || data.currentStep,
                        stepProgress: data.stepProgress,
                      };
                    }
                    return updated;
                  });

                  // Update page title with overall progress
                  const overallProgress = Math.round(
                    ((fileIndex + data.progress / 100) / totalFiles) * 100
                  );
                  document.title = `${overallProgress}% - Uploading Images`;
                } else if (data.type === "complete") {
                  // Mark file as complete
                  const fileIndex = globalOffset + data.fileIndex;
                  setProgress((prev) => {
                    const updated = [...prev];
                    if (updated[fileIndex]) {
                      updated[fileIndex] = {
                        ...updated[fileIndex],
                        progress: 100,
                        status: "complete",
                        currentStep: "Complete",
                        imageUrl: data.imageUrl,
                        metadata: data.metadata,
                      };
                    }
                    return updated;
                  });
                } else if (data.type === "error") {
                  // Mark file as error
                  const fileIndex = globalOffset + data.fileIndex;
                  setProgress((prev) => {
                    const updated = [...prev];
                    if (updated[fileIndex]) {
                      updated[fileIndex] = {
                        ...updated[fileIndex],
                        status: "error",
                        error: data.error,
                        currentStep: "Error",
                      };
                    }
                    return updated;
                  });
                } else if (data.error) {
                  // Handle general errors (like "No valid files to process")
                  console.error("❌ API Error:", data.error);
                  throw new Error(data.error);
                }
              } catch (parseError) {
                console.warn("Failed to parse stream data:", line, parseError);
              }
            }
          }
        } finally {
          reader.releaseLock();
        }

        console.log(`✅ Chunk ${chunkIndex + 1} processed successfully`);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.error(
          `❌ Fetch error for chunk ${chunkIndex + 1}:`,
          fetchError
        );
        throw fetchError;
      }
    } catch (error) {
      console.error(`❌ Chunk ${chunkIndex + 1} processing failed:`, error);

      // Mark all files in this chunk as error
      for (let i = 0; i < chunk.length; i++) {
        const fileIndex = globalOffset + i;
        setProgress((prev) => {
          const updated = [...prev];
          if (updated[fileIndex]) {
            updated[fileIndex] = {
              ...updated[fileIndex],
              status: "error",
              error: error instanceof Error ? error.message : "Upload failed",
              currentStep: "Error",
            };
          }
          return updated;
        });
      }

      throw error;
    }
  };

  // Calculate overall progress
  const overallProgress =
    progress.length > 0
      ? Math.round(
          progress.reduce((acc, p) => acc + p.progress, 0) / progress.length
        )
      : 0;

  // Check if all uploads are complete
  const allComplete =
    progress.length > 0 && progress.every((p) => p.status === "complete");
  const hasErrors = progress.some((p) => p.status === "error");

  // Trigger completion callback when all files are done
  useEffect(() => {
    console.log("🔄 Checking completion status:", {
      progressLength: progress.length,
      pendingFilesLength: pendingFiles.length,
      allComplete,
      hasErrors,
      uploadSuccess,
    });

    if (progress.length > 0 && progress.length === pendingFiles.length) {
      const completedCount = progress.filter(
        (p) => p.status === "complete"
      ).length;
      const errorCount = progress.filter((p) => p.status === "error").length;
      const totalCount = progress.length;

      console.log("📊 Upload summary:", {
        completed: completedCount,
        errors: errorCount,
        total: totalCount,
      });

      if (completedCount + errorCount === totalCount) {
        console.log("🏁 All uploads finished, triggering completion");

        // Restore original page title
        if (originalTitle) {
          document.title = originalTitle;
        }

        // Trigger completion callback after a short delay
        setTimeout(() => {
          console.log("🎯 Calling onComplete callback");
          stableOnComplete();
        }, 1000);
      }
    }
  }, [
    progress.length,
    pendingFiles.length,
    allComplete,
    hasErrors,
    uploadSuccess,
    originalTitle,
    stableOnComplete,
  ]);

  // Additional completion check with delay
  useEffect(() => {
    if (allComplete && !hasErrors) {
      console.log(
        "✅ All uploads completed successfully, setting delayed completion"
      );
      setTimeout(() => {
        console.log("🎯 Delayed completion trigger");
        stableOnComplete();
      }, 2000);
    }
  }, [allComplete, hasErrors, stableOnComplete]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  // Prevent navigation during upload
  useEffect(() => {
    if (!isUploading) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Upload in progress. Are you sure you want to leave?";
    };

    const handlePopState = (e: PopStateEvent) => {
      if (
        !confirm(
          "Upload in progress. Are you sure you want to leave this page?"
        )
      ) {
        e.preventDefault();
        // Push the current state back to prevent navigation
        window.history.pushState(null, "", window.location.href);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);

    // Push current state to handle back button
    window.history.pushState(null, "", window.location.href);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isUploading]);

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="w-full space-y-6">
      {/* AI Analysis Settings - Show before file selection like original */}
      {progress.length === 0 && !isUploading && (
        <div className="space-y-4">
          {isLoadingPrompts ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm text-muted-foreground">
                Loading prompts...
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Analysis Prompt
                </label>
                <Select
                  value={selectedPromptId}
                  onValueChange={setSelectedPromptId}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {selectedPromptId
                        ? availablePrompts.find(
                            (p) => p._id === selectedPromptId
                          )?.name
                        : "Select analysis prompt"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {availablePrompts.map((prompt) => (
                      <SelectItem key={prompt._id} value={prompt._id}>
                        {prompt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  AI Model
                </label>
                <Select
                  value={selectedModelId}
                  onValueChange={setSelectedModelId}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {selectedModelId
                        ? IMAGE_ANALYSIS_CONFIG.availableModels.find(
                            (m) => m.id === selectedModelId
                          )?.name
                        : "Select AI model"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {IMAGE_ANALYSIS_CONFIG.availableModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload area */}
      {pendingFiles.length === 0 && progress.length === 0 && (
        <div
          className={cn(
            "border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer transition-colors",
            isUploading
              ? "pointer-events-none opacity-50"
              : "hover:border-border/80"
          )}
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onDragEnter={(e) => e.preventDefault()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple={multiple}
            className="hidden"
            onChange={handleInputChange}
            disabled={isUploading}
          />
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-foreground mb-2">
            {multiple ? "Upload images" : "Upload image"}
          </p>
          <p className="text-sm text-muted-foreground">
            Drag and drop {multiple ? "images" : "an image"} here, or click to
            select {multiple ? "files" : "a file"}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Supports JPG, PNG, GIF, WebP up to 8MB each
          </p>
        </div>
      )}

      {/* Pending files list */}
      {pendingFiles.length > 0 && progress.length === 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-foreground">
              {pendingFiles.length} file{pendingFiles.length !== 1 ? "s" : ""}{" "}
              ready to upload
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClick}
              disabled={isUploading}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add more
            </Button>
          </div>

          <div className="grid gap-3 max-h-48 overflow-y-auto">
            {pendingFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-card border border-border rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-card-foreground truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removePendingFile(index)}
                  disabled={isUploading}
                >
                  <XIcon className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={startUpload}
              disabled={isUploading || pendingFiles.length === 0}
              className="flex-1 min-w-0"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload {pendingFiles.length} file
                  {pendingFiles.length !== 1 ? "s" : ""}
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setPendingFiles([])}
              disabled={isUploading}
              className="flex-shrink-0"
            >
              Clear
            </Button>
            {onCancel && (
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={isUploading}
                className="flex-shrink-0"
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Upload progress */}
      {progress.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-foreground">
              Upload Progress
            </h3>
            <div className="text-sm text-muted-foreground">
              {progress.filter((p) => p.status === "complete").length} /{" "}
              {progress.length} completed
            </div>
          </div>

          {/* Overall progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-foreground">Overall Progress</span>
              <span className="text-muted-foreground">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="w-full" />
          </div>

          {/* Individual file progress - Simplified layout */}
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {progress.map((fileProgress) => (
              <div key={fileProgress.fileId} className="space-y-2">
                {/* File name and status on same line */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground truncate">
                      {fileProgress.fileName}
                    </span>
                    {fileProgress.status === "complete" && (
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    )}
                    {fileProgress.status === "error" && (
                      <XIcon className="w-4 h-4 text-destructive flex-shrink-0" />
                    )}
                    {fileProgress.status === "uploading" && (
                      <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
                    )}
                    {fileProgress.status === "analyzing" && (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500 flex-shrink-0" />
                    )}
                    {/* Status message inline with filename */}
                    {fileProgress.currentStep && (
                      <span className="text-xs text-muted-foreground truncate">
                        - {fileProgress.currentStep}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {fileProgress.progress}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <Progress value={fileProgress.progress} className="w-full" />

                {/* Error messages only (status moved inline above) */}
                {fileProgress.error && (
                  <div className="text-xs text-destructive">
                    {fileProgress.error}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Completion message */}
          {allComplete && (
            <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-2" />
                <span className="text-green-800 dark:text-green-200 font-medium">
                  All files uploaded successfully!
                </span>
              </div>
            </div>
          )}

          {/* Error summary */}
          {hasErrors && (
            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center">
                <XIcon className="w-5 h-5 text-red-500 mr-2" />
                <span className="text-red-800 dark:text-red-200 font-medium">
                  Some uploads failed. Please try again.
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
