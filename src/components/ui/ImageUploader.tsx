import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { Upload, Check, X as XIcon, Loader2, Plus, MapPin } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LocationResponse } from "@/models/location";

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
  console.log("📸 ImageUploader rendering:", {
    mode,
    ...(mode === "car"
      ? { carId, hasVehicleInfo: !!vehicleInfo }
      : { hasMetadata: !!metadata }),
  });
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
  const [imageContext, setImageContext] = useState<string>("");
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [locations, setLocations] = useState<LocationResponse[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const { user } = useFirebaseAuth();

  // Store original page title to restore later
  const [originalTitle, setOriginalTitle] = useState<string>("");

  // Compute effective analysis settings
  const shouldAnalyze = mode === "car";
  const effectiveModelId =
    selectedModelId ||
    (shouldAnalyze
      ? IMAGE_ANALYSIS_CONFIG.availableModels.find((m) => m.isDefault)?.id ||
        "gpt-4o-mini"
      : selectedModelId);
  const effectivePromptId =
    selectedPromptId && selectedPromptId !== "__default__"
      ? selectedPromptId
      : null;

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
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔄 Loading AI analysis prompts...");
        const data = (await api.get(
          "admin/image-analysis-prompts/active"
        )) as ImageAnalysisPrompt[];
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("✅ Received prompts data:", data);
        setAvailablePrompts(data || []);

        // Set default prompt if available
        const defaultPrompt = data?.find(
          (p: ImageAnalysisPrompt) => p.isDefault
        );
        if (defaultPrompt) {
          setSelectedPromptId(defaultPrompt._id);
          // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("✅ Set default prompt:", defaultPrompt.name);
        } else {
          // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("⚠️ No default prompt found");
        }
      } catch (error) {
        console.error("❌ Failed to load prompts:", error);
      } finally {
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🏁 Setting isLoadingPrompts to false");
        setIsLoadingPrompts(false);
      }
    };

    loadPrompts();
  }, [api]);

  // Load locations on component mount
  useEffect(() => {
    if (!api) return;

    const loadLocations = async () => {
      try {
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔄 Loading locations...");
        const data = (await api.get("locations")) as LocationResponse[];
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("✅ Received locations data:", data);
        setLocations(data || []);
      } catch (error) {
        console.error("❌ Failed to load locations:", error);
      } finally {
        setIsLoadingLocations(false);
      }
    };

    loadLocations();
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
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("No files provided");
      return;
    }

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("handleFiles called with:", files.length, "files");

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

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Oversized files:", oversizedFiles.length);

    if (oversizedFiles.length > 0) {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Calling onError for oversized files");
      onError?.(
        `The following files are too large (over 8MB): ${oversizedFiles.map((f) => f.name).join(", ")}. Please compress them before uploading.`
      );
      return;
    }

    // For large batches, we'll process them in chunks automatically
    const totalSize = fileArray.reduce((acc, file) => acc + file.size, 0);
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Total size:", (totalSize / 1024 / 1024).toFixed(1), "MB");
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Will process", fileArray.length, "files in chunks if needed");

    setPendingFiles(fileArray);
    setProgress([]); // Reset progress if new files are selected
  };

  // Create chunks of files for upload
  const createUploadChunks = (files: File[]): File[][] => {
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("=== CHUNK CREATION START ===");
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Input files:", files.length);
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
    const maxChunkSize = 2 * 1024 * 1024; // 2MB per chunk - very conservative to avoid payload limits
    const maxFilesPerChunk = 1; // Process one file at a time to avoid any payload issues

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

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Created ${chunks.length} chunks from ${files.length} files`);
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
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("=== CHUNK CREATION END ===");

    return chunks;
  };

  // Start the upload process
  const startUpload = async () => {
    if (pendingFiles.length === 0) return;

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🚀 Starting upload process...");
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Selected prompt:", effectivePromptId || "default");
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Selected model:", effectiveModelId || "none");
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Mode:", mode);
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Car ID:", carId);
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Analysis enabled:", shouldAnalyze);
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Files to upload:", pendingFiles.length);
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
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Processing ${chunks.length} chunks`);

      let globalFileIndex = 0;

      // Process chunks sequentially to avoid overwhelming the endpoints
      const maxParallelChunks = 1; // Process one chunk at a time to avoid any issues
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

      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("✅ All chunks processed successfully");
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
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`=== PROCESSING CHUNK ${chunkIndex + 1} ===`);
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

      // Process each file in the chunk individually with direct Cloudflare uploads
      for (let localIndex = 0; localIndex < chunk.length; localIndex++) {
        const file = chunk[localIndex];
        const fileIndex = globalOffset + localIndex;

        console.log(
          `Processing file ${localIndex + 1}/${chunk.length}: ${file.name}`
        );

        try {
          console.log(
            `🚀 Starting upload for file ${localIndex + 1}/${chunk.length}: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`
          );

          // Update progress to show upload starting
          setProgress((prev) => {
            const updated = [...prev];
            if (updated[fileIndex]) {
              updated[fileIndex] = {
                ...updated[fileIndex],
                status: "uploading",
                currentStep: "Uploading to Cloudflare...",
                progress: 10,
              };
            }
            return updated;
          });

          // Upload directly to Cloudflare via our proxy endpoint (avoids payload limits)
          const formData = new FormData();
          formData.append("file", file);

          // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Direct Cloudflare upload for: ${file.name}`);

          const cloudflareResponse = await fetch("/api/cloudflare/thumbnails", {
            method: "POST",
            body: formData,
          });

          if (!cloudflareResponse.ok) {
            const errorText = await cloudflareResponse.text();
            console.error(`❌ Cloudflare upload failed for ${file.name}:`, {
              status: cloudflareResponse.status,
              statusText: cloudflareResponse.statusText,
              errorText: errorText,
            });
            throw new Error(
              `Cloudflare upload failed: ${cloudflareResponse.status} ${cloudflareResponse.statusText} - ${errorText}`
            );
          }

          const cloudflareResult = await cloudflareResponse.json();
          console.log(`✅ Cloudflare upload successful for ${file.name}:`, {
            imageId: cloudflareResult.imageId,
            imageUrl: cloudflareResult.imageUrl,
          });

          if (!cloudflareResult.success) {
            console.error(
              `❌ Cloudflare API error for ${file.name}:`,
              cloudflareResult.error
            );
            throw new Error(
              `Cloudflare API error: ${cloudflareResult.error || "Unknown error"}`
            );
          }

          // Update progress for successful Cloudflare upload
          setProgress((prev) => {
            const updated = [...prev];
            if (updated[fileIndex]) {
              updated[fileIndex] = {
                ...updated[fileIndex],
                status: "analyzing",
                currentStep: "Processing with AI...",
                progress: 40,
              };
            }
            return updated;
          });

          // Extract image URL
          const imageUrl = cloudflareResult.imageUrl;
          const cloudflareId = cloudflareResult.imageId;

          // Now process the image through our backend for AI analysis and database storage
          const analysisFormData = new FormData();
          analysisFormData.append("cloudflareId", cloudflareId);
          analysisFormData.append("imageUrl", imageUrl);
          analysisFormData.append("fileName", file.name);
          analysisFormData.append(
            "selectedPromptId",
            effectivePromptId || "default"
          );
          analysisFormData.append(
            "selectedModelId",
            effectiveModelId || "none"
          );

          // Add entity-specific data based on upload mode
          if (mode === "car" && carId) {
            // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`🚗 Car upload mode - adding carId: ${carId}`);
            analysisFormData.append("carId", carId);
            if (vehicleInfo) {
              analysisFormData.append(
                "vehicleInfo",
                JSON.stringify(vehicleInfo)
              );
            }
          } else if (mode === "general") {
            // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`📁 General upload mode - adding metadata for project`);
            const enhancedMetadata = {
              ...metadata,
              imageContext: imageContext.trim() || undefined,
              locationId:
                selectedLocationId && selectedLocationId !== "none"
                  ? selectedLocationId
                  : undefined,
            };
            analysisFormData.append(
              "metadata",
              JSON.stringify(enhancedMetadata)
            );
          } else {
            console.warn(`⚠️ Invalid upload mode or missing parameters:`, {
              mode,
              carId,
              metadata,
            });
          }

          // Call our backend for AI analysis and database storage
          let analysisSuccess = false;
          try {
            const analysisResponse = await fetch(
              "/api/cloudflare/images/analyze",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                },
                body: analysisFormData,
              }
            );

            if (analysisResponse.ok) {
              const analysisResult = await analysisResponse.json();
              if (analysisResult.success) {
                analysisSuccess = true;
                // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`✅ AI analysis completed for ${file.name}`);

                // Update progress with analysis results
                setProgress((prev) => {
                  const updated = [...prev];
                  if (updated[fileIndex]) {
                    updated[fileIndex] = {
                      ...updated[fileIndex],
                      status: "complete",
                      currentStep: "Complete with AI analysis",
                      progress: 100,
                      imageUrl: imageUrl,
                      metadata: analysisResult.metadata,
                    };
                  }
                  return updated;
                });
              } else {
                console.warn(
                  `⚠️ AI analysis API returned error for ${file.name}:`,
                  analysisResult.error
                );
              }
            } else {
              console.warn(
                `⚠️ AI analysis HTTP error for ${file.name}: ${analysisResponse.status}`
              );
            }
          } catch (analysisError) {
            console.warn(
              `⚠️ AI analysis exception for ${file.name}:`,
              analysisError
            );
          }

          // If analysis failed, still mark as complete since the image was uploaded successfully
          if (!analysisSuccess) {
            console.log(
              `✅ Image uploaded successfully (without AI analysis): ${file.name}`
            );
          }

          // Update progress for completion (only if analysis didn't already do it)
          if (!analysisSuccess) {
            setProgress((prev) => {
              const updated = [...prev];
              if (updated[fileIndex]) {
                updated[fileIndex] = {
                  ...updated[fileIndex],
                  status: "complete",
                  currentStep: "Complete (upload only)",
                  progress: 100,
                  imageUrl: imageUrl,
                };
              }
              return updated;
            });
          }

          // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`✅ File ${file.name} processed successfully`);
        } catch (error) {
          console.error(`❌ Error processing file ${file.name}:`, error);

          // Mark file as error
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
      }

      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`✅ Chunk ${chunkIndex + 1} processed successfully`);
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
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🏁 All uploads finished, triggering completion");

        // Restore original page title
        if (originalTitle) {
          document.title = originalTitle;
        }

        // Trigger completion callback after a short delay
        setTimeout(() => {
          // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🎯 Calling onComplete callback");
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
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🎯 Delayed completion trigger");
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
          {isLoadingPrompts || isLoadingLocations ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm text-muted-foreground">
                Loading {isLoadingPrompts ? "prompts" : "locations"}...
              </span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Auto-analysis info for car mode */}
              {mode === "car" && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium text-blue-900">
                      AI Analysis Enabled
                    </span>
                  </div>
                  <p className="text-xs text-blue-700 mt-1">
                    {selectedPromptId && selectedPromptId !== "__default__"
                      ? `Using custom prompt: ${availablePrompts.find((p) => p._id === selectedPromptId)?.name}`
                      : "Using default analysis prompt"}{" "}
                    • Model: {effectiveModelId}
                  </p>
                </div>
              )}

              {/* Context and location fields */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="image-context"
                    className="text-sm font-medium"
                  >
                    Additional Context for Analysis
                    <span className="text-xs text-muted-foreground ml-2">
                      (Optional - helps AI understand the images better)
                    </span>
                  </Label>
                  <Textarea
                    id="image-context"
                    placeholder="Describe what's in these images or what you want the AI to focus on..."
                    value={imageContext}
                    onChange={(e) => setImageContext(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="location-select"
                    className="text-sm font-medium"
                  >
                    Location
                    <span className="text-xs text-muted-foreground ml-2">
                      (Optional - where these images were taken)
                    </span>
                  </Label>
                  <Select
                    value={selectedLocationId}
                    onValueChange={setSelectedLocationId}
                  >
                    <SelectTrigger id="location-select">
                      <SelectValue placeholder="Select a location...">
                        {selectedLocationId && selectedLocationId !== "none" ? (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            {
                              locations.find((l) => l.id === selectedLocationId)
                                ?.name
                            }
                          </div>
                        ) : selectedLocationId === "none" ? (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            No location
                          </div>
                        ) : (
                          "Select a location..."
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          No location
                        </div>
                      </SelectItem>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            {location.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Analysis Prompt{" "}
                    {mode === "car" && (
                      <span className="text-xs text-muted-foreground">
                        (optional)
                      </span>
                    )}
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
                          : mode === "car"
                            ? "Default analysis prompt"
                            : "Select analysis prompt"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {mode === "car" && (
                        <SelectItem value="__default__">
                          <span className="text-muted-foreground">
                            Default analysis prompt
                          </span>
                        </SelectItem>
                      )}
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
                    AI Model{" "}
                    {mode === "car" && (
                      <span className="text-xs text-muted-foreground">
                        (auto-selected)
                      </span>
                    )}
                  </label>
                  <Select
                    value={selectedModelId}
                    onValueChange={setSelectedModelId}
                  >
                    <SelectTrigger>
                      <SelectValue>
                        {effectiveModelId
                          ? IMAGE_ANALYSIS_CONFIG.availableModels.find(
                              (m) => m.id === effectiveModelId
                            )?.name
                          : "Select AI model"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {IMAGE_ANALYSIS_CONFIG.availableModels.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex items-center space-x-2">
                            <span>{model.name}</span>
                            {model.isDefault && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">
                                Default
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                  <p
                    className="text-sm font-medium text-card-foreground truncate max-w-[400px]"
                    title={file.name}
                  >
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
                {/* File name and status - improved layout for long filenames */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <span
                        className="text-sm font-medium text-foreground truncate max-w-[400px]"
                        title={fileProgress.fileName}
                      >
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
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {fileProgress.progress}%
                      </span>
                    </div>
                  </div>
                  {/* Status message on separate line for better readability */}
                  {fileProgress.currentStep && (
                    <div className="text-xs text-muted-foreground pl-0">
                      {fileProgress.currentStep}
                    </div>
                  )}
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
