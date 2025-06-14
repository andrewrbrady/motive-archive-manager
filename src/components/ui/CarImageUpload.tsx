import React, { useRef, useState, useEffect } from "react";
import { Upload, Check, X as XIcon, Loader2 } from "lucide-react";
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

interface CarImageUploadProps {
  carId: string;
  vehicleInfo?: any;
  onComplete?: () => void;
  onError?: (error: string) => void;
  multiple?: boolean;
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

const CarImageUpload: React.FC<CarImageUploadProps> = ({
  carId,
  vehicleInfo,
  onComplete,
  onError,
  multiple = true,
}) => {
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

  // Load available prompts on component mount
  useEffect(() => {
    if (!api) return;

    const loadPrompts = async () => {
      try {
        console.log("Loading prompts...");
        const data = (await api.get(
          "admin/image-analysis-prompts/active"
        )) as ImageAnalysisPrompt[];
        console.log("Received prompts data:", data);
        setAvailablePrompts(data || []);

        // Set default prompt if available
        const defaultPrompt = data?.find(
          (p: ImageAnalysisPrompt) => p.isDefault
        );
        if (defaultPrompt) {
          setSelectedPromptId(defaultPrompt._id);
          console.log("Set default prompt:", defaultPrompt.name);
        }
      } catch (error) {
        console.error("Failed to load prompts:", error);
      } finally {
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
    const maxFilesPerChunk = 5; // Max 5 files per chunk

    console.log("Chunk limits:", {
      maxChunkSize:
        maxChunkSize +
        " bytes (" +
        (maxChunkSize / 1024 / 1024).toFixed(1) +
        "MB)",
      maxFilesPerChunk: maxFilesPerChunk,
    });

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // If adding this file would exceed limits, start a new chunk
      if (
        (currentChunkSize + file.size > maxChunkSize &&
          currentChunk.length > 0) ||
        currentChunk.length >= maxFilesPerChunk
      ) {
        console.log(`Chunk ${chunks.length} complete:`, {
          files: currentChunk.length,
          totalSize:
            currentChunkSize +
            " bytes (" +
            (currentChunkSize / 1024 / 1024).toFixed(2) +
            "MB)",
          fileNames: currentChunk.map((f) => f.name),
        });

        chunks.push([...currentChunk]);
        currentChunk = [];
        currentChunkSize = 0;
      }

      console.log(`Adding file ${i} to chunk ${chunks.length}:`, {
        fileName: file.name,
        fileSize:
          file.size + " bytes (" + (file.size / 1024 / 1024).toFixed(2) + "MB)",
        chunkSizeAfter:
          currentChunkSize +
          file.size +
          " bytes (" +
          ((currentChunkSize + file.size) / 1024 / 1024).toFixed(2) +
          "MB)",
      });

      currentChunk.push(file);
      currentChunkSize += file.size;
    }

    // Add the last chunk if it has files
    if (currentChunk.length > 0) {
      console.log(`Final chunk ${chunks.length} complete:`, {
        files: currentChunk.length,
        totalSize:
          currentChunkSize +
          " bytes (" +
          (currentChunkSize / 1024 / 1024).toFixed(2) +
          "MB)",
        fileNames: currentChunk.map((f) => f.name),
      });
      chunks.push(currentChunk);
    }

    console.log("=== CHUNK CREATION SUMMARY ===");
    console.log("Total chunks created:", chunks.length);
    chunks.forEach((chunk, index) => {
      const chunkSize = chunk.reduce((sum, file) => sum + file.size, 0);
      console.log(`Chunk ${index}:`, {
        files: chunk.length,
        totalSize:
          chunkSize + " bytes (" + (chunkSize / 1024 / 1024).toFixed(2) + "MB)",
        fileNames: chunk.map((f) => f.name),
      });
    });

    return chunks;
  };

  // Start upload with chunked processing
  const startUpload = async () => {
    if (pendingFiles.length === 0) return;

    console.log("=== UPLOAD START ===");
    console.log("Timestamp:", new Date().toISOString());
    console.log("Total files to upload:", pendingFiles.length);

    const totalUploadSize = pendingFiles.reduce(
      (sum, file) => sum + file.size,
      0
    );
    console.log(
      "Total upload size:",
      totalUploadSize +
        " bytes (" +
        (totalUploadSize / 1024 / 1024).toFixed(2) +
        "MB)"
    );

    console.log("File breakdown:");
    pendingFiles.forEach((file, index) => {
      console.log(
        `  ${index}: ${file.name} - ${file.size} bytes (${(file.size / 1024 / 1024).toFixed(2)}MB) - ${file.type}`
      );
    });

    setIsUploading(true);
    setUploadSuccess(false);

    // Initialize progress for all files
    const initialProgress: ImageProgress[] = pendingFiles.map(
      (file, index) => ({
        fileId: `${index}-${file.name}`,
        fileName: file.name,
        progress: 0,
        status: "pending",
        currentStep: "Preparing upload...",
        stepProgress: {
          cloudflare: {
            status: "pending",
            progress: 0,
            message: "Waiting to start",
          },
          openai: {
            status: "pending",
            progress: 0,
            message: "Waiting for upload",
          },
        },
      })
    );
    setProgress(initialProgress);

    try {
      // Create chunks for processing
      const chunks = createUploadChunks(pendingFiles);
      console.log(
        `Processing ${pendingFiles.length} files in ${chunks.length} chunks`
      );

      let completedFiles = 0;
      const totalFiles = pendingFiles.length;

      // Process each chunk sequentially
      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const chunk = chunks[chunkIndex];
        console.log(
          `Processing chunk ${chunkIndex + 1}/${chunks.length} with ${chunk.length} files`
        );

        await processChunk(chunk, chunkIndex, completedFiles, totalFiles);
        completedFiles += chunk.length;
      }

      console.log("All chunks processed successfully");
      setUploadSuccess(true);

      // Clear pending files
      setPendingFiles([]);

      // Trigger onComplete callback after a short delay
      setTimeout(() => {
        if (onComplete) {
          onComplete();
        }
      }, 2000);
    } catch (error) {
      console.error("Upload error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed";

      // Update all pending files to error status
      setProgress((prev) =>
        prev.map((p) => ({
          ...p,
          status: p.status === "complete" ? "complete" : "error",
          error: p.status === "complete" ? undefined : errorMessage,
        }))
      );

      if (onError) {
        onError(errorMessage);
      }
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
    console.log(
      `=== PROCESSING CHUNK ${chunkIndex + 1}/${Math.ceil(totalFiles / 5)} ===`
    );
    console.log("Chunk details:", {
      chunkIndex,
      globalOffset,
      totalFiles: totalFiles,
      filesInChunk: chunk.length,
      files: chunk.map((f, i) => ({
        localIndex: i,
        globalIndex: globalOffset + i,
        name: f.name,
        size: f.size + " bytes (" + (f.size / 1024 / 1024).toFixed(2) + "MB)",
        type: f.type,
      })),
    });

    const chunkTotalSize = chunk.reduce((sum, file) => sum + file.size, 0);
    console.log(
      "Chunk total file size:",
      chunkTotalSize +
        " bytes (" +
        (chunkTotalSize / 1024 / 1024).toFixed(2) +
        "MB)"
    );

    // Update chunk files to "uploading" status
    chunk.forEach((file, localIndex) => {
      const globalIndex = globalOffset + localIndex;
      const fileId = `${globalIndex}-${file.name}`;

      setProgress((prev) =>
        prev.map((p) =>
          p.fileId === fileId
            ? {
                ...p,
                status: "uploading",
                currentStep: `Chunk ${chunkIndex + 1}: Uploading...`,
              }
            : p
        )
      );
    });

    // Declare variables outside try block for error handling access
    let estimatedFormDataSize = 0;
    let formData: FormData;

    try {
      console.log("=== CREATING FORM DATA ===");
      const formDataStart = performance.now();

      // Create FormData with format expected by /api/cloudflare/images
      formData = new FormData();

      // Add files with numbered naming (file0, file1, etc.)
      chunk.forEach((file, index) => {
        console.log(`Adding file${index}:`, {
          name: file.name,
          size:
            file.size +
            " bytes (" +
            (file.size / 1024 / 1024).toFixed(2) +
            "MB)",
          type: file.type,
        });
        formData.append(`file${index}`, file);
      });

      formData.append("carId", carId);
      formData.append("fileCount", chunk.length.toString());

      // Add selected prompt and model
      if (selectedPromptId) {
        formData.append("selectedPromptId", selectedPromptId);
      }
      if (selectedModelId) {
        formData.append("selectedModelId", selectedModelId);
      }

      const formDataTime = performance.now() - formDataStart;
      console.log("FormData creation time:", formDataTime.toFixed(2) + "ms");

      // Log FormData structure
      console.log("FormData entries being sent:");
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(
            `  ${key}: File "${value.name}" (${value.size} bytes, ${value.type})`
          );
        } else {
          console.log(`  ${key}: "${value}"`);
        }
      }

      // Try to estimate FormData size (this is approximate)
      estimatedFormDataSize = 0;
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          // FormData overhead includes boundaries, headers, filename, etc.
          // Rough estimation: ~200-300 bytes per field + file content
          estimatedFormDataSize += value.size + 300;
        } else {
          estimatedFormDataSize += key.length + value.toString().length + 100;
        }
      }

      console.log("=== PAYLOAD SIZE ESTIMATION ===");
      console.log(
        "Raw files size:",
        chunkTotalSize +
          " bytes (" +
          (chunkTotalSize / 1024 / 1024).toFixed(2) +
          "MB)"
      );
      console.log(
        "Estimated FormData size:",
        estimatedFormDataSize +
          " bytes (" +
          (estimatedFormDataSize / 1024 / 1024).toFixed(2) +
          "MB)"
      );
      console.log(
        "Estimated overhead:",
        estimatedFormDataSize -
          chunkTotalSize +
          " bytes (" +
          ((estimatedFormDataSize - chunkTotalSize) / 1024 / 1024).toFixed(2) +
          "MB)"
      );
      console.log(
        "Estimated overhead percentage:",
        (
          ((estimatedFormDataSize - chunkTotalSize) / chunkTotalSize) *
          100
        ).toFixed(1) + "%"
      );

      // Check proximity to Vercel limit
      const vercelLimit = 4.5 * 1024 * 1024; // 4.5MB
      console.log(
        "Proximity to Vercel 4.5MB limit:",
        ((estimatedFormDataSize / vercelLimit) * 100).toFixed(1) + "%"
      );

      if (estimatedFormDataSize > vercelLimit) {
        console.error("🚨 ESTIMATED PAYLOAD EXCEEDS VERCEL LIMIT!");
        console.error("Estimated size:", estimatedFormDataSize + " bytes");
        console.error("Vercel limit:", vercelLimit + " bytes");
        console.error("This chunk will likely cause a 413 error");
      } else if (estimatedFormDataSize > vercelLimit * 0.9) {
        console.warn("⚠️ Payload approaching Vercel limit (>90%)");
      }

      // Get auth token
      console.log("=== STARTING UPLOAD REQUEST ===");
      const token = await getValidToken();
      const uploadStart = performance.now();

      console.log("Making fetch request to /api/cloudflare/images");
      console.log("Request headers:", {
        method: "POST",
        Authorization: "Bearer [TOKEN]",
        // Note: Content-Type will be set automatically by FormData
      });

      // Start the streaming upload
      const response = await fetch("/api/cloudflare/images", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const uploadTime = performance.now() - uploadStart;
      console.log(
        "Initial response received in:",
        uploadTime.toFixed(2) + "ms"
      );
      console.log("Response status:", response.status);
      console.log("Response statusText:", response.statusText);
      console.log(
        "Response headers:",
        Object.fromEntries([...response.headers.entries()])
      );

      if (!response.ok) {
        console.error("=== UPLOAD REQUEST FAILED ===");
        console.error("Status:", response.status);
        console.error("Status text:", response.statusText);

        // Special handling for 413 errors
        if (response.status === 413) {
          console.error("🚨 413 CONTENT TOO LARGE ERROR DETECTED!");
          console.error(
            "This confirms the FormData payload exceeded Vercel's 4.5MB limit"
          );
          console.error(
            "Estimated payload size was:",
            estimatedFormDataSize + " bytes"
          );
          console.error("Raw files size was:", chunkTotalSize + " bytes");
          console.error(
            "This indicates multipart form overhead caused the limit breach"
          );
        }

        // Try to get error response body
        try {
          const errorText = await response.text();
          console.error("Error response body:", errorText);
        } catch (e) {
          console.error("Could not read error response body:", e);
        }

        throw new Error(
          `Upload failed: ${response.status} ${response.statusText}`
        );
      }

      console.log("=== STARTING STREAM PROCESSING ===");

      // Handle Server-Sent Events stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("Failed to get response reader");
      }

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete messages
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              // Handle individual file progress updates
              if (data.fileId && data.fileName) {
                // Map the chunk-local fileId to global fileId
                const chunkFileIndex = parseInt(data.fileId.split("-")[0]);
                const globalFileIndex = globalOffset + chunkFileIndex;
                const globalFileId = `${globalFileIndex}-${data.fileName}`;

                setProgress((prev) =>
                  prev.map((p) =>
                    p.fileId === globalFileId
                      ? {
                          ...p,
                          progress: data.progress || p.progress,
                          status: data.status || p.status,
                          currentStep:
                            data.currentStep ||
                            `Chunk ${chunkIndex + 1}: ${data.status}`,
                          error: data.error,
                          imageUrl: data.imageUrl || p.imageUrl,
                          metadata: data.metadata || p.metadata,
                          stepProgress: {
                            cloudflare: {
                              status:
                                data.status === "uploading"
                                  ? "uploading"
                                  : data.status === "analyzing"
                                    ? "complete"
                                    : data.status === "complete"
                                      ? "complete"
                                      : "pending",
                              progress:
                                data.status === "uploading"
                                  ? data.progress
                                  : data.status === "analyzing"
                                    ? 100
                                    : data.status === "complete"
                                      ? 100
                                      : 0,
                              message:
                                data.status === "uploading"
                                  ? "Uploading to Cloudflare..."
                                  : data.status === "analyzing"
                                    ? "Upload complete"
                                    : data.status === "complete"
                                      ? "Upload complete"
                                      : "Waiting",
                            },
                            openai: {
                              status:
                                data.status === "analyzing"
                                  ? "analyzing"
                                  : data.status === "complete"
                                    ? "complete"
                                    : "pending",
                              progress:
                                data.status === "analyzing"
                                  ? 50
                                  : data.status === "complete"
                                    ? 100
                                    : 0,
                              message:
                                data.status === "analyzing"
                                  ? "Analyzing with AI..."
                                  : data.status === "complete"
                                    ? "Analysis complete"
                                    : "Waiting for upload",
                            },
                          },
                        }
                      : p
                  )
                );
              }

              // Handle chunk completion
              if (data.type === "complete") {
                console.log(`Chunk ${chunkIndex + 1} completed:`, data);
                // Don't set uploadSuccess here - wait for all chunks
              } else if (data.type === "error" || data.error) {
                console.error(`Chunk ${chunkIndex + 1} error:`, data.error);
                throw new Error(data.error || "Chunk upload failed");
              }
            } catch (parseError) {
              console.error("Error parsing SSE data:", parseError, line);
            }
          }
        }
      }
    } catch (error) {
      console.error(`=== CHUNK ${chunkIndex + 1} UPLOAD ERROR ===`);
      console.error("Error type:", error?.constructor?.name || "Unknown");
      console.error(
        "Error message:",
        error instanceof Error ? error.message : "Chunk upload failed"
      );
      console.error(
        "Error stack:",
        error instanceof Error ? error.stack : "No stack trace"
      );

      // Log chunk details for debugging
      console.error("Failed chunk details:", {
        chunkIndex: chunkIndex + 1,
        filesInChunk: chunk.length,
        chunkSize:
          chunkTotalSize +
          " bytes (" +
          (chunkTotalSize / 1024 / 1024).toFixed(2) +
          "MB)",
        estimatedFormDataSize:
          estimatedFormDataSize +
          " bytes (" +
          (estimatedFormDataSize / 1024 / 1024).toFixed(2) +
          "MB)",
        files: chunk.map((f) => ({ name: f.name, size: f.size })),
      });

      // Special handling for 413 errors
      if (
        error instanceof Error &&
        (error.message.includes("413") ||
          error.message.includes("Content Too Large"))
      ) {
        console.error("🚨 413 ERROR CONFIRMED IN FRONTEND!");
        console.error("The server returned a 413 Content Too Large error");
        console.error("This chunk exceeded Vercel's 4.5MB body size limit");
        console.error("Raw file size:", chunkTotalSize + " bytes");
        console.error(
          "Estimated FormData size:",
          estimatedFormDataSize + " bytes"
        );
        console.error(
          "Multipart overhead:",
          estimatedFormDataSize - chunkTotalSize + " bytes"
        );
      }

      const errorMessage =
        error instanceof Error ? error.message : "Chunk upload failed";

      // Update chunk files to error status
      chunk.forEach((file, localIndex) => {
        const globalIndex = globalOffset + localIndex;
        const fileId = `${globalIndex}-${file.name}`;

        setProgress((prev) =>
          prev.map((p) =>
            p.fileId === fileId
              ? { ...p, status: "error", error: errorMessage }
              : p
          )
        );
      });

      throw error; // Re-throw to stop processing subsequent chunks
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const handleClick = () => {
    if (!isUploading) inputRef.current?.click();
  };

  // Calculate overall percent
  const overallPercent =
    progress.length > 0
      ? Math.floor(
          progress.reduce((acc, p) => acc + p.progress, 0) / progress.length
        )
      : 0;

  const allComplete =
    progress.length > 0 && progress.every((p) => p.status === "complete");

  // Prevent window closing during upload and update page title with progress
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isUploading && progress.length > 0) {
        e.preventDefault();
        e.returnValue = "Upload in progress. Are you sure you want to leave?";
        return "Upload in progress. Are you sure you want to leave?";
      }
      return undefined;
    };

    // Update page title with upload progress
    if (isUploading && progress.length > 0) {
      const activeUploads = progress.filter(
        (p) => p.status !== "complete" && p.status !== "error"
      ).length;
      const completedUploads = progress.filter(
        (p) => p.status === "complete"
      ).length;
      const totalUploads = progress.length;

      if (activeUploads > 0) {
        // Show progress while uploading
        document.title = `(${completedUploads}/${totalUploads}) Uploading ${overallPercent}% - ${originalTitle}`;
      } else if (completedUploads === totalUploads && uploadSuccess) {
        // Show completion
        document.title = `✅ Upload Complete - ${originalTitle}`;
      }

      // Add beforeunload listener during upload
      window.addEventListener("beforeunload", handleBeforeUnload);

      return () => {
        window.removeEventListener("beforeunload", handleBeforeUnload);
      };
    } else {
      // Restore original title when not uploading
      if (originalTitle && document.title !== originalTitle) {
        document.title = originalTitle;
      }
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isUploading, progress, overallPercent, uploadSuccess, originalTitle]);

  // Remove a file from pending list
  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  if (!api) return <div>Loading...</div>;

  return (
    <div>
      {/* Analysis Options - only show if not uploading and no progress yet */}
      {progress.length === 0 && !isUploading && (
        <div className="space-y-4 mb-4">
          {/* Prompt Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Analysis Prompt</label>
            <Select
              value={selectedPromptId}
              onValueChange={setSelectedPromptId}
              disabled={isLoadingPrompts}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    isLoadingPrompts
                      ? "Loading prompts..."
                      : "Select analysis prompt"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availablePrompts.map((prompt) => (
                  <SelectItem key={prompt._id} value={prompt._id}>
                    <div className="flex flex-col">
                      <span>{prompt.name}</span>
                      {prompt.description && (
                        <span className="text-xs text-muted-foreground">
                          {prompt.description}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">AI Model</label>
            <Select value={selectedModelId} onValueChange={setSelectedModelId}>
              <SelectTrigger>
                <SelectValue placeholder="Select AI model" />
              </SelectTrigger>
              <SelectContent>
                {IMAGE_ANALYSIS_CONFIG.availableModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex flex-col">
                      <span>{model.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {model.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* File select/drop UI, only if not uploading and no progress yet */}
      {progress.length === 0 && !isUploading && (
        <div
          className={cn(
            "border border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-background"
          )}
          tabIndex={0}
          role="button"
          aria-disabled={isUploading}
          onClick={handleClick}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleFiles(e.dataTransfer.files);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          aria-label="Upload images"
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
          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
          <div className="text-sm font-medium">
            Click to select or drag and drop images
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Images up to 8MB each (25MB total per batch)
          </div>
        </div>
      )}

      {/* Pending files list and confirm button */}
      {pendingFiles.length > 0 && progress.length === 0 && !isUploading && (
        <div className="mt-4 w-full">
          <div className="mb-2 font-medium">Files to upload:</div>
          <ul className="w-full max-w-[350px] overflow-hidden mb-4 divide-y divide-border rounded border border-border bg-background max-h-48 overflow-y-auto">
            {pendingFiles.map((file, i) => (
              <li
                key={i}
                className="flex items-center w-full max-w-full min-w-0 px-3 py-2 text-sm overflow-hidden"
              >
                <span className="truncate flex-1 min-w-0 max-w-full block whitespace-nowrap">
                  {file.name}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removePendingFile(i)}
                  className="ml-2 h-6 w-6 p-0"
                >
                  <XIcon className="h-3 w-3" />
                </Button>
              </li>
            ))}
          </ul>
          <Button onClick={startUpload} className="w-full">
            Upload {pendingFiles.length} file
            {pendingFiles.length > 1 ? "s" : ""}
          </Button>
        </div>
      )}

      {/* Simplified progress display */}
      {progress.length > 0 && (
        <div className="mt-4 w-full space-y-3">
          <div className="text-sm font-medium">
            Uploading {progress.length} file{progress.length > 1 ? "s" : ""}...
          </div>

          {/* Individual file progress */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {progress.map((fileProgress, i) => (
              <div key={fileProgress.fileId} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {fileProgress.status === "uploading" && (
                      <Loader2 className="h-3 w-3 animate-spin flex-shrink-0" />
                    )}
                    {fileProgress.status === "analyzing" && (
                      <Loader2 className="h-3 w-3 animate-spin flex-shrink-0 text-purple-500" />
                    )}
                    {fileProgress.status === "complete" && (
                      <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                    )}
                    {fileProgress.status === "error" && (
                      <XIcon className="h-3 w-3 text-red-500 flex-shrink-0" />
                    )}
                    <span className="truncate text-muted-foreground">
                      {fileProgress.fileName}
                    </span>
                  </div>
                  <span className="text-xs font-medium ml-2 flex-shrink-0">
                    {fileProgress.progress}%
                  </span>
                </div>
                <Progress
                  value={fileProgress.progress}
                  className={cn(
                    "h-1.5",
                    fileProgress.status === "error" && "bg-red-100"
                  )}
                />
                {fileProgress.error && (
                  <div className="text-xs text-red-500 px-1">
                    {fileProgress.error}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Overall progress */}
          <div className="space-y-1 pt-2 border-t border-border">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>Overall Progress</span>
              <span>{overallPercent}%</span>
            </div>
            <Progress
              value={overallPercent}
              className={cn("h-2", allComplete && "bg-green-100")}
            />
          </div>
        </div>
      )}

      {/* Success Message */}
      {uploadSuccess && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-center">
              <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
              <div>
                <p className="text-green-800 font-medium">
                  Upload and Analysis Complete!
                </p>
                <p className="text-green-600 text-sm">
                  Successfully uploaded and analyzed {progress.length} image(s)
                  with AI metadata including angle, view, and description.
                </p>
                <p className="text-green-600 text-xs mt-1">
                  Closing automatically in 2 seconds...
                </p>
              </div>
            </div>
            {onComplete && (
              <Button
                variant="outline"
                size="sm"
                onClick={onComplete}
                className="ml-4 flex-shrink-0"
              >
                Close Now
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CarImageUpload;
