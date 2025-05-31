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

interface CarImageUploadProps {
  carId: string;
  vehicleInfo?: any;
  onComplete?: () => void;
  onError?: (error: string) => void;
  multiple?: boolean;
}

interface FileProgress {
  file: File;
  percent: number;
  status: "idle" | "uploading" | "complete" | "error";
  error?: string;
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
  const [progress, setProgress] = useState<FileProgress[]>([]);
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
  const { user } = useFirebaseAuth();

  if (!api) return <div>Loading...</div>;

  // Load available prompts on component mount
  useEffect(() => {
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

  // Handle file selection or drop
  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setPendingFiles(Array.from(files));
    setProgress([]); // Reset progress if new files are selected
  };

  // Start upload after confirmation
  const startUpload = async () => {
    if (pendingFiles.length === 0) return;

    setIsUploading(true);
    const fileProgress = pendingFiles.map((file) => ({
      file,
      percent: 0,
      status: "uploading" as const,
    }));
    setProgress(fileProgress);

    try {
      // Create FormData with the format expected by /api/cloudflare/images
      const formData = new FormData();
      formData.append("fileCount", pendingFiles.length.toString());
      formData.append("carId", carId);

      // Add selected prompt and model
      if (selectedPromptId) {
        formData.append("selectedPromptId", selectedPromptId);
      }
      formData.append("selectedModelId", selectedModelId);

      if (vehicleInfo) {
        formData.append("vehicleInfo", JSON.stringify(vehicleInfo));
      }

      // Add files with numbered names (file0, file1, etc.)
      pendingFiles.forEach((file, index) => {
        formData.append(`file${index}`, file);
      });

      // Get auth token for manual fetch with streaming
      const token = await getValidToken();

      // Use manual fetch to handle streaming response
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

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.fileId) {
                  // Update progress for specific file
                  const fileIndex = parseInt(data.fileId.split("-")[0]);
                  if (fileIndex >= 0 && fileIndex < fileProgress.length) {
                    setProgress((prev) =>
                      prev.map((p, i) =>
                        i === fileIndex
                          ? {
                              ...p,
                              percent: data.progress || 0,
                              status:
                                data.status === "complete"
                                  ? "complete"
                                  : "uploading",
                            }
                          : p
                      )
                    );
                  }
                } else if (data.type === "complete") {
                  // All files completed
                  setProgress((prev) =>
                    prev.map((p) => ({
                      ...p,
                      percent: 100,
                      status: "complete",
                    }))
                  );
                  break;
                } else if (data.error) {
                  throw new Error(data.error);
                }
              } catch (e) {
                console.error("Error parsing progress data:", e);
              }
            }
          }
        }
      }

      // Mark all as complete
      setProgress((prev) =>
        prev.map((p) => ({ ...p, percent: 100, status: "complete" }))
      );
    } catch (error) {
      console.error("Upload error:", error);
      setProgress((prev) =>
        prev.map((p) => ({
          ...p,
          status: "error",
          error: error instanceof Error ? error.message : "Upload failed",
        }))
      );
      if (onError) {
        onError(error instanceof Error ? error.message : "Upload failed");
      }
    }

    setIsUploading(false);
    const completed = progress.filter((p) => p.status === "complete").length;
    if (completed === fileProgress.length && onComplete) {
      onComplete();
    }
    setPendingFiles([]); // Clear pending files after upload
  };

  const uploadSingleFile = (
    file: File,
    onProgress: (percent: number) => void
  ) => {
    return new Promise<void>(async (resolve, reject) => {
      try {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append("fileCount", "1");
        formData.append("file0", file);
        formData.append("carId", carId);

        if (vehicleInfo) {
          formData.append("vehicleInfo", JSON.stringify(vehicleInfo));
        }

        // Get auth token for XMLHttpRequest
        const token = await getValidToken();

        xhr.open("POST", "/api/cloudflare/images");
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            onProgress(100);
            resolve();
          } else {
            reject(new Error("Upload failed: " + xhr.statusText));
          }
        };
        xhr.onerror = () => {
          reject(new Error("Network error during upload"));
        };
        xhr.send(formData);
      } catch (error) {
        reject(error);
      }
    });
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
          progress.reduce((acc, p) => acc + p.percent, 0) / progress.length
        )
      : 0;
  const allComplete =
    progress.length > 0 && progress.every((p) => p.status === "complete");

  // Remove a file from pending list
  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

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
            Images up to 5MB each
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

      {/* Progress display during upload */}
      {progress.length > 0 && (
        <div className="mt-4 w-full">
          <div className="mb-2 font-medium">
            Uploading {progress.length} file{progress.length > 1 ? "s" : ""}...
          </div>
          <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
            {progress.map((fileProgress, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate flex-1">
                    {fileProgress.file.name}
                  </span>
                  <div className="flex items-center gap-2">
                    {fileProgress.status === "uploading" && (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    )}
                    {fileProgress.status === "complete" && (
                      <Check className="h-3 w-3 text-green-500" />
                    )}
                    {fileProgress.status === "error" && (
                      <XIcon className="h-3 w-3 text-red-500" />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {fileProgress.percent}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      fileProgress.status === "complete"
                        ? "bg-green-500"
                        : fileProgress.status === "error"
                          ? "bg-red-500"
                          : "bg-primary"
                    )}
                    style={{ width: `${fileProgress.percent}%` }}
                  />
                </div>
                {fileProgress.error && (
                  <div className="text-xs text-red-500">
                    {fileProgress.error}
                  </div>
                )}
              </div>
            ))}
          </div>
          {/* Overall progress */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>Overall Progress</span>
              <span>{overallPercent}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  allComplete ? "bg-green-500" : "bg-primary"
                )}
                style={{ width: `${overallPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CarImageUpload;
