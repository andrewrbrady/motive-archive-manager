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
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);

    // Check individual file sizes (8MB limit per file)
    const oversizedFiles = fileArray.filter(
      (file) => file.size > 8 * 1024 * 1024
    );
    if (oversizedFiles.length > 0) {
      onError?.(
        `The following files are too large (over 8MB): ${oversizedFiles.map((f) => f.name).join(", ")}. Please compress them before uploading.`
      );
      return;
    }

    // Check total batch size (25MB limit for Vercel functions)
    const totalSize = fileArray.reduce((acc, file) => acc + file.size, 0);
    if (totalSize > 25 * 1024 * 1024) {
      onError?.(
        `Total upload size (${(totalSize / 1024 / 1024).toFixed(1)}MB) exceeds 25MB limit. Please upload fewer images at once or compress them.`
      );
      return;
    }

    setPendingFiles(fileArray);
    setProgress([]); // Reset progress if new files are selected
  };

  // Start upload with streaming progress
  const startUpload = async () => {
    if (pendingFiles.length === 0) return;

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
      // Create FormData with format expected by /api/cloudflare/images
      const formData = new FormData();

      // Add files with numbered naming (file0, file1, etc.)
      pendingFiles.forEach((file, index) => {
        formData.append(`file${index}`, file);
      });

      formData.append("carId", carId);
      formData.append("fileCount", pendingFiles.length.toString());

      // Add selected prompt and model
      if (selectedPromptId) {
        formData.append("selectedPromptId", selectedPromptId);
      }
      if (selectedModelId) {
        formData.append("selectedModelId", selectedModelId);
      }

      // Get auth token
      const token = await getValidToken();

      // Start the streaming upload
      const response = await fetch("/api/cloudflare/images", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

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
                setProgress((prev) =>
                  prev.map((p) =>
                    p.fileId === data.fileId
                      ? {
                          ...p,
                          progress: data.progress || p.progress,
                          status: data.status || p.status,
                          currentStep: data.currentStep || p.currentStep,
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

              // Handle completion or error
              if (data.type === "complete") {
                console.log("Upload batch completed:", data);
                setUploadSuccess(true);

                // Clear pending files
                setPendingFiles([]);

                // Trigger onComplete callback after a short delay
                setTimeout(() => {
                  if (onComplete) {
                    onComplete();
                  }
                }, 2000);
              } else if (data.type === "error" || data.error) {
                console.error("Upload error:", data.error);
                if (onError) {
                  onError(data.error || "Upload failed");
                }
              }
            } catch (parseError) {
              console.error("Error parsing SSE data:", parseError, line);
            }
          }
        }
      }
    } catch (error) {
      console.error("Upload error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed";

      // Update all files to error status
      setProgress((prev) =>
        prev.map((p) => ({
          ...p,
          status: "error",
          error: errorMessage,
        }))
      );

      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsUploading(false);
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
