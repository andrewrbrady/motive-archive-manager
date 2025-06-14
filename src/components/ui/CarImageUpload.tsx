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

    // Check individual file sizes (25MB limit per file for direct upload)
    const oversizedFiles = fileArray.filter(
      (file) => file.size > 25 * 1024 * 1024
    );

    console.log("Oversized files:", oversizedFiles.length);

    if (oversizedFiles.length > 0) {
      console.log("Calling onError for oversized files");
      onError?.(
        `The following files are too large (over 25MB): ${oversizedFiles.map((f) => f.name).join(", ")}. Please compress them before uploading.`
      );
      return;
    }

    const totalSize = fileArray.reduce((acc, file) => acc + file.size, 0);
    console.log("Total size:", (totalSize / 1024 / 1024).toFixed(1), "MB");
    console.log("Will process", fileArray.length, "files with direct upload");

    setPendingFiles(fileArray);
    setProgress([]); // Reset progress if new files are selected
  };

  // Start upload with direct upload processing
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
      console.log(`Processing ${pendingFiles.length} files with direct upload`);

      // Process each file individually with direct upload
      for (let fileIndex = 0; fileIndex < pendingFiles.length; fileIndex++) {
        const file = pendingFiles[fileIndex];
        console.log(
          `Processing file ${fileIndex + 1}/${pendingFiles.length}: ${file.name}`
        );

        await processDirectUpload(file, fileIndex, pendingFiles.length);
      }

      console.log("All files processed successfully");
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

  // Process a single file with direct upload
  const processDirectUpload = async (
    file: File,
    fileIndex: number,
    totalFiles: number
  ) => {
    const fileId = `${fileIndex}-${file.name}`;

    try {
      // Step 1: Get direct upload URL
      setProgress((prev) =>
        prev.map((p) =>
          p.fileId === fileId
            ? {
                ...p,
                status: "uploading",
                currentStep: "Getting upload URL...",
                progress: 10,
                stepProgress: {
                  ...p.stepProgress,
                  cloudflare: {
                    status: "uploading",
                    progress: 10,
                    message: "Getting upload URL...",
                  },
                },
              }
            : p
        )
      );

      const uploadUrlResponse = await fetch("/api/cloudflare/direct-upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          carId,
        }),
      });

      if (!uploadUrlResponse.ok) {
        const errorData = await uploadUrlResponse.json();
        throw new Error(errorData.error || "Failed to get upload URL");
      }

      const { uploadURL } = await uploadUrlResponse.json();

      // Step 2: Upload file directly to Cloudflare
      setProgress((prev) =>
        prev.map((p) =>
          p.fileId === fileId
            ? {
                ...p,
                currentStep: "Uploading to Cloudflare...",
                progress: 30,
                stepProgress: {
                  ...p.stepProgress,
                  cloudflare: {
                    status: "uploading",
                    progress: 30,
                    message: "Uploading to Cloudflare...",
                  },
                },
              }
            : p
        )
      );

      const formData = new FormData();
      formData.append("file", file);

      const directUploadResponse = await fetch(uploadURL, {
        method: "POST",
        body: formData,
      });

      if (!directUploadResponse.ok) {
        throw new Error("Direct upload to Cloudflare failed");
      }

      const uploadResult = await directUploadResponse.json();

      if (!uploadResult.success) {
        throw new Error("Cloudflare upload failed");
      }

      // Step 3: Notify completion
      setProgress((prev) =>
        prev.map((p) =>
          p.fileId === fileId
            ? {
                ...p,
                currentStep: "Processing completion...",
                progress: 80,
                stepProgress: {
                  cloudflare: {
                    status: "complete",
                    progress: 100,
                    message: "Upload complete",
                  },
                  openai: {
                    status: "analyzing",
                    progress: 50,
                    message: "Processing...",
                  },
                },
              }
            : p
        )
      );

      const token = await getValidToken();
      const completionResponse = await fetch(
        "/api/cloudflare/images/complete",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            imageId: uploadResult.result.id,
            carId,
            imageUrl:
              uploadResult.result.variants?.[0] || uploadResult.result.filename,
            fileName: file.name,
            fileSize: file.size,
            selectedPromptId,
            selectedModelId,
          }),
        }
      );

      if (!completionResponse.ok) {
        const errorData = await completionResponse.json();
        throw new Error(errorData.error || "Failed to complete upload");
      }

      // Final success update
      setProgress((prev) =>
        prev.map((p) =>
          p.fileId === fileId
            ? {
                ...p,
                status: "complete",
                currentStep: "Upload complete",
                progress: 100,
                imageUrl:
                  uploadResult.result.variants?.[0] ||
                  uploadResult.result.filename,
                stepProgress: {
                  cloudflare: {
                    status: "complete",
                    progress: 100,
                    message: "Upload complete",
                  },
                  openai: {
                    status: "complete",
                    progress: 100,
                    message: "Analysis complete",
                  },
                },
              }
            : p
        )
      );
    } catch (error) {
      console.error(`Direct upload error for ${file.name}:`, error);
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed";

      setProgress((prev) =>
        prev.map((p) =>
          p.fileId === fileId
            ? {
                ...p,
                status: "error",
                error: errorMessage,
                currentStep: `Error: ${errorMessage}`,
              }
            : p
        )
      );

      throw error;
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
      } else if (allComplete) {
        // Show completion
        document.title = `✅ Upload Complete - ${originalTitle}`;
      }
    } else if (originalTitle) {
      // Restore original title
      document.title = originalTitle;
    }

    // Add event listener
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isUploading, progress, overallPercent, allComplete, originalTitle]);

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Model and Prompt Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Model Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">AI Model</label>
          <Select value={selectedModelId} onValueChange={setSelectedModelId}>
            <SelectTrigger>
              <SelectValue placeholder="Select AI model" />
            </SelectTrigger>
            <SelectContent>
              {IMAGE_ANALYSIS_CONFIG.availableModels.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{model.name}</span>
                    <span className="text-xs text-gray-500">
                      {model.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Prompt Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Analysis Prompt
          </label>
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
                    <span className="font-medium">{prompt.name}</span>
                    {prompt.description && (
                      <span className="text-xs text-gray-500">
                        {prompt.description}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Upload Area */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          isUploading
            ? "border-gray-300 bg-gray-50"
            : "border-gray-300 hover:border-gray-400 hover:bg-gray-50 cursor-pointer"
        )}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={handleClick}
      >
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-lg font-medium text-gray-700 mb-2">
          {isUploading ? "Uploading..." : "Drop images here or click to select"}
        </p>
        <p className="text-sm text-gray-500">
          {multiple
            ? "Select multiple images (up to 25MB each)"
            : "Select an image (up to 25MB)"}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
          disabled={isUploading}
        />
      </div>

      {/* Pending Files */}
      {pendingFiles.length > 0 && !isUploading && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700">
            Ready to upload ({pendingFiles.length} files)
          </h3>
          <div className="space-y-2">
            {pendingFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  onClick={() => removePendingFile(index)}
                  className="ml-4 p-1 text-gray-400 hover:text-red-500"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <Button
            onClick={startUpload}
            disabled={!selectedPromptId || !selectedModelId}
            className="w-full"
          >
            Upload {pendingFiles.length}{" "}
            {pendingFiles.length === 1 ? "Image" : "Images"}
          </Button>
        </div>
      )}

      {/* Upload Progress */}
      {progress.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">
              Upload Progress
            </h3>
            <span className="text-sm text-gray-500">
              {progress.filter((p) => p.status === "complete").length}/
              {progress.length} completed
            </span>
          </div>

          {/* Overall Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Overall Progress</span>
              <span className="text-sm text-gray-600">{overallPercent}%</span>
            </div>
            <Progress value={overallPercent} className="w-full" />
          </div>

          {/* Individual File Progress */}
          <div className="space-y-3">
            {progress.map((item) => (
              <div key={item.fileId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {item.status === "complete" && (
                      <Check className="w-4 h-4 text-green-500" />
                    )}
                    {item.status === "error" && (
                      <XIcon className="w-4 h-4 text-red-500" />
                    )}
                    {item.status === "uploading" && (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    )}
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {item.fileName}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {item.progress}%
                  </span>
                </div>

                <Progress
                  value={item.progress}
                  className={cn(
                    "w-full h-2",
                    item.status === "error" && "bg-red-100",
                    item.status === "complete" && "bg-green-100"
                  )}
                />

                {item.currentStep && (
                  <p className="text-xs text-gray-500">{item.currentStep}</p>
                )}

                {item.error && (
                  <p className="text-xs text-red-600">{item.error}</p>
                )}

                {/* Step Progress Details */}
                {item.stepProgress && (
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span>Cloudflare Upload</span>
                        <span>
                          {item.stepProgress.cloudflare?.progress || 0}%
                        </span>
                      </div>
                      <Progress
                        value={item.stepProgress.cloudflare?.progress || 0}
                        className="h-1"
                      />
                      {item.stepProgress.cloudflare?.message && (
                        <p className="text-gray-500">
                          {item.stepProgress.cloudflare.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span>AI Analysis</span>
                        <span>{item.stepProgress.openai?.progress || 0}%</span>
                      </div>
                      <Progress
                        value={item.stepProgress.openai?.progress || 0}
                        className="h-1"
                      />
                      {item.stepProgress.openai?.message && (
                        <p className="text-gray-500">
                          {item.stepProgress.openai.message}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success Message */}
      {uploadSuccess && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <Check className="w-5 h-5 text-green-500 mr-2" />
            <span className="text-sm font-medium text-green-800">
              All images uploaded successfully!
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CarImageUpload;
