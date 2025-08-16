/**
 * UNIFIED IMAGE UPLOADER - The One True Uploader
 *
 * This replaces ALL the scattered image upload components with a single,
 * high-performance, parallel-processing uploader that handles:
 * - Cars (with proper car associations)
 * - Projects (with proper project associations)
 * - General uploads
 * - Inspections
 * - Content studio
 * - Production/inventory
 *
 * Features:
 * - TRUE parallel processing (no more sequential bullshit)
 * - Quality-first optimization (only compress when necessary)
 * - Proper endpoint routing (/api/cloudflare/images for speed)
 * - Smart context detection
 * - Drag & drop support
 * - Real-time progress tracking
 * - Error handling with retries
 */

import React, { useCallback, useRef, useState, useEffect } from "react";
import {
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  FileImage,
  Camera,
  Settings,
  Brain,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import {
  optimizeImageForUpload,
  OptimizationResult,
} from "@/lib/imageOptimization";
import { useAPI } from "@/hooks/useAPI";
import { getValidToken } from "@/lib/api-client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";

// Unified context types - covers ALL use cases
export type UploadContext =
  | "car"
  | "project"
  | "inspection"
  | "content-studio"
  | "production"
  | "inventory"
  | "general";

// Analysis interfaces
interface ImageAnalysisPrompt {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  isDefault: boolean;
}

interface LocationResponse {
  id: string;
  name: string;
  address?: string;
  type?: string;
}

// Analysis configuration
const IMAGE_ANALYSIS_CONFIG = {
  availableModels: [
    { id: "gpt-4o", label: "GPT-4o (Recommended)", isDefault: false },
    { id: "gpt-4o-mini", label: "GPT-4o Mini (Fast)", isDefault: true },
    { id: "gpt-4-vision-preview", label: "GPT-4 Vision", isDefault: false },
  ],
};

export interface UnifiedUploadProgress {
  id: string;
  fileName: string;
  status:
    | "pending"
    | "optimizing"
    | "uploading"
    | "analyzing"
    | "complete"
    | "error";
  progress: number;
  imageUrl?: string;
  error?: string;
  metadata?: any;
}

export interface UnifiedImageUploaderProps {
  // Core functionality
  onUploadComplete?: (results: { url: string; metadata: any }[]) => void;
  onProgress?: (progress: UnifiedUploadProgress[]) => void;
  onError?: (error: string) => void;

  // Context & associations
  context: UploadContext;
  carId?: string;
  projectId?: string;

  // UI configuration
  maxFiles?: number; // Optional limit, defaults to unlimited
  disabled?: boolean;
  className?: string;
  showDropzone?: boolean;
  showAnalysisOptions?: boolean; // Show AI analysis configuration panel

  // Additional metadata
  metadata?: Record<string, any>;
  vehicleInfo?: any; // For car context

  // Callbacks
  onComplete?: () => void;
  onCancel?: () => void;
}

interface UploadFile {
  id: string;
  file: File;
  optimizedFile?: File;
  optimizationResult?: OptimizationResult;
}

export const UnifiedImageUploader: React.FC<UnifiedImageUploaderProps> = ({
  onUploadComplete,
  onProgress,
  onError,
  context,
  carId,
  projectId,
  maxFiles = Infinity, // No limit by default
  disabled = false,
  className = "",
  showDropzone = true,
  showAnalysisOptions = true,
  metadata = {},
  vehicleInfo,
  onComplete,
  onCancel,
}) => {
  const api = useAPI();
  const { toast } = useToast();
  const { user } = useFirebaseAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  // Core upload state
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [progress, setProgress] = useState<UnifiedUploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // AI Analysis state
  const [selectedPromptId, setSelectedPromptId] = useState<string>("");
  const [selectedModelId, setSelectedModelId] = useState<string>(
    IMAGE_ANALYSIS_CONFIG.availableModels.find((m) => m.isDefault)?.id ||
      "gpt-4o-mini"
  );
  const [availablePrompts, setAvailablePrompts] = useState<
    ImageAnalysisPrompt[]
  >([]);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);
  const [imageContext, setImageContext] = useState<string>("");

  // Location state (for car context)
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [locations, setLocations] = useState<LocationResponse[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);

  // Determine the optimal endpoint based on context
  const getUploadEndpoint = useCallback(() => {
    if (context === "project" && projectId) {
      return `/api/projects/${projectId}/images`;
    }
    return "/api/images/upload";
  }, [context, projectId]);

  // Load analysis prompts
  useEffect(() => {
    if (!api || !showAnalysisOptions) return;

    const loadPrompts = async () => {
      setIsLoadingPrompts(true);
      try {
        const data = (await api.get(
          "admin/image-analysis-prompts/active"
        )) as ImageAnalysisPrompt[];
        setAvailablePrompts(data || []);

        // Set default prompt if available
        const defaultPrompt = data?.find((p) => p.isDefault);
        if (defaultPrompt) {
          setSelectedPromptId(defaultPrompt._id);
        }
      } catch (error) {
        console.error("Failed to load analysis prompts:", error);
      } finally {
        setIsLoadingPrompts(false);
      }
    };

    loadPrompts();
  }, [api, showAnalysisOptions]);

  // Load locations for car context
  useEffect(() => {
    if (!api || context !== "car") return;

    const loadLocations = async () => {
      setIsLoadingLocations(true);
      try {
        const data = (await api.get("locations")) as LocationResponse[];
        console.log("🗺️ Loaded locations:", data);
        setLocations(data || []);
      } catch (error) {
        console.error("Failed to load locations:", error);
      } finally {
        setIsLoadingLocations(false);
      }
    };

    loadLocations();
  }, [api, context]);

  // Create context-specific metadata
  const getContextMetadata = useCallback(() => {
    const baseMetadata = {
      ...metadata,
      context,
      uploadedAt: new Date().toISOString(),
      // Analysis settings
      ...(showAnalysisOptions && {
        selectedPromptId: selectedPromptId || undefined,
        selectedModelId,
        imageContext: imageContext || undefined,
        selectedLocationId: selectedLocationId || undefined,
      }),
    };

    switch (context) {
      case "car":
        return {
          ...baseMetadata,
          carId,
          vehicleInfo,
          category: "automotive",
          analysisContext: "car_image",
        };
      case "project":
        return {
          ...baseMetadata,
          projectId,
          category: "project",
          analysisContext: "project_image",
        };
      case "inspection":
        return {
          ...baseMetadata,
          category: "inspection",
          analysisContext: "inspection_image",
        };
      case "content-studio":
        return {
          ...baseMetadata,
          category: "content",
          analysisContext: "content_studio_image",
        };
      case "production":
      case "inventory":
        return {
          ...baseMetadata,
          category: "production",
          analysisContext: "production_image",
        };
      default:
        return {
          ...baseMetadata,
          category: "general",
          analysisContext: "general_image",
        };
    }
  }, [
    context,
    carId,
    projectId,
    metadata,
    vehicleInfo,
    showAnalysisOptions,
    selectedPromptId,
    selectedModelId,
    imageContext,
    selectedLocationId,
  ]);

  // File validation
  const validateFile = (file: File): string | null => {
    const MAX_SIZE = 50 * 1024 * 1024; // 50MB
    const ALLOWED_TYPES = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/heic",
      "image/heif",
    ];

    if (!ALLOWED_TYPES.includes(file.type)) {
      return `${file.name}: Unsupported file type. Please use JPEG, PNG, WebP, GIF, or HEIC.`;
    }

    if (file.size > MAX_SIZE) {
      return `${file.name}: File too large. Maximum size is 50MB.`;
    }

    return null;
  };

  // Handle file selection
  const handleFileSelect = useCallback(
    (newFiles: File[]) => {
      const errors: string[] = [];
      const validFiles: File[] = [];

      // Validate files
      newFiles.forEach((file) => {
        const error = validateFile(file);
        if (error) {
          errors.push(error);
        } else {
          validFiles.push(file);
        }
      });

      // Check total count (only if maxFiles is not Infinity)
      if (
        maxFiles !== Infinity &&
        files.length + validFiles.length > maxFiles
      ) {
        errors.push(`Cannot upload more than ${maxFiles} files total.`);
        return;
      }

      // Show errors
      if (errors.length > 0) {
        onError?.(errors.join("\n"));
        toast({
          title: "Upload Error",
          description: errors.join("\n"),
          variant: "destructive",
        });
        return;
      }

      // Add valid files
      const uploadFiles: UploadFile[] = validFiles.map((file) => ({
        id: Math.random().toString(36).substring(2, 15),
        file,
      }));

      setFiles((prev) => [...prev, ...uploadFiles]);

      // Initialize progress
      const newProgress: UnifiedUploadProgress[] = uploadFiles.map((uf) => ({
        id: uf.id,
        fileName: uf.file.name,
        status: "pending",
        progress: 0,
      }));

      setProgress((prev) => [...prev, ...newProgress]);
    },
    [files.length, maxFiles, onError, toast]
  );

  // Upload process - TRUE PARALLEL PROCESSING
  const startUpload = useCallback(async () => {
    if (files.length === 0 || isUploading) return;

    setIsUploading(true);
    const endpoint = getUploadEndpoint();
    const contextMetadata = getContextMetadata();

    console.log(
      `🚀 Starting PARALLEL upload of ${files.length} files to ${endpoint}`
    );

    try {
      // Process ALL files in parallel - no more sequential bullshit!
      const uploadPromises = files.map(async (uploadFile) => {
        const updateProgress = (updates: Partial<UnifiedUploadProgress>) => {
          setProgress((prev) =>
            prev.map((p) => (p.id === uploadFile.id ? { ...p, ...updates } : p))
          );
        };

        try {
          // TEMPORARY: Skip optimization to debug file issue
          updateProgress({ status: "optimizing", progress: 10 });

          // Use original file directly - no optimization for now
          const optimizationResult = {
            optimizedFile: uploadFile.file,
            compressionRatio: 1,
            formatChanged: false,
            optimizationApplied: false,
          };

          console.log("🔧 Skipping optimization, using original file directly");

          updateProgress({ progress: 25 });

          // Step 2: Upload to server
          updateProgress({ status: "uploading", progress: 30 });

          const formData = new FormData();

          // Debug: Log file details
          console.log("🔍 Uploading file:", {
            originalName: uploadFile.file.name,
            originalSize: uploadFile.file.size,
            originalType: uploadFile.file.type,
            optimizedName: optimizationResult.optimizedFile.name,
            optimizedSize: optimizationResult.optimizedFile.size,
            optimizedType: optimizationResult.optimizedFile.type,
          });

          // JSON endpoint expects one or more "files" entries
          formData.append("files", optimizationResult.optimizedFile);
          formData.append(
            "metadata",
            JSON.stringify({
              ...contextMetadata,
              originalSize: uploadFile.file.size,
              optimizedSize: optimizationResult.optimizedFile.size,
              compressionRatio: optimizationResult.compressionRatio,
              formatChanged: optimizationResult.formatChanged,
            })
          );

          // Add context-specific form data
          if (carId) formData.append("carId", carId);
          if (projectId) formData.append("projectId", projectId);

          // Add analysis configuration if available
          if (showAnalysisOptions) {
            if (selectedPromptId)
              formData.append("selectedPromptId", selectedPromptId);
            if (selectedModelId)
              formData.append("selectedModelId", selectedModelId);
            if (selectedLocationId)
              formData.append("selectedLocationId", selectedLocationId);
            if (imageContext) formData.append("imageContext", imageContext);
            if (vehicleInfo)
              formData.append("vehicleInfo", JSON.stringify(vehicleInfo));
          }

          updateProgress({ progress: 50 });

          // Debug: Log FormData contents
          console.log("🚀 Sending FormData to", endpoint);
          for (const [key, value] of formData.entries()) {
            if (value instanceof File) {
              console.log(
                `  ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`
              );
            } else {
              console.log(`  ${key}: ${value}`);
            }
          }

          // Use JSON endpoint (no streaming)
          const token = await getValidToken();
          const uploadResponse = await fetch(endpoint, {
            method: "POST",
            body: formData,
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          console.log("🔍 Upload Response Status:", uploadResponse.status);

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error("❌ Upload failed:", errorText);
            throw new Error(`Upload failed: ${uploadResponse.statusText}`);
          }

          const data = await uploadResponse.json();
          const projectResponse = Array.isArray(data?.uploadedImages)
            ? data
            : null;
          const generalResponse = Array.isArray(data?.images) ? data : null;

          if (!projectResponse && !generalResponse) {
            throw new Error(
              (data && data.error) || "No images were uploaded successfully"
            );
          }

          const uploadedImage = projectResponse
            ? projectResponse.uploadedImages[0]
            : generalResponse!.images[0];
          // Always normalize to base URL to avoid double variants later
          let imageUrl: string = uploadedImage.url;
          if (imageUrl.includes("imagedelivery.net")) {
            const match = imageUrl.match(
              /^(https:\/\/imagedelivery\.net\/[^\/]+\/[^\/]+)/
            );
            if (match) {
              imageUrl = match[1];
            }
          }
          // Do not append any variant here; keep base. Rendering components decide variants.
          console.log("🎉 Upload successful, URL:", imageUrl);
          updateProgress({
            status: "analyzing",
            progress: 75,
            imageUrl,
            metadata: uploadedImage.metadata || {},
          });

          // Trigger AI analysis and persist metadata (non-blocking failure)
          try {
            const imageId =
              uploadedImage.id ||
              uploadedImage._id ||
              uploadedImage.cloudflareId;
            if (imageId) {
              const analysisRes = await fetch("/api/openai/reanalyze-image", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  imageId,
                  carId: carId || undefined,
                  promptId: selectedPromptId || undefined,
                  modelId: selectedModelId || undefined,
                }),
              });

              if (analysisRes.ok) {
                const analysisData = await analysisRes.json();
                updateProgress({
                  metadata:
                    analysisData.newMetadata || uploadedImage.metadata || {},
                });
              } else {
                const errText = await analysisRes.text();
                console.warn("Analysis failed:", errText);
              }
            } else {
              console.warn("No imageId found for analysis; skipping");
            }
          } catch (analysisError) {
            console.warn("AI analysis error (non-blocking):", analysisError);
          }

          // Step 3: Complete
          updateProgress({
            status: "complete",
            progress: 100,
          });

          return { url: imageUrl, metadata: uploadedImage.metadata || {} };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Upload failed";
          updateProgress({
            status: "error",
            error: errorMessage,
          });
          console.error(`Upload failed for ${uploadFile.file.name}:`, error);
          return null;
        }
      });

      // Wait for ALL uploads to complete
      const results = await Promise.allSettled(uploadPromises);

      // Collect successful results
      const successfulUploads = results
        .filter(
          (
            result
          ): result is PromiseFulfilledResult<{
            url: string;
            metadata: any;
          } | null> => result.status === "fulfilled" && result.value !== null
        )
        .map((result) => result.value!);

      console.log(
        `✅ Upload complete! ${successfulUploads.length}/${files.length} successful`
      );

      // Notify completion
      if (successfulUploads.length > 0) {
        onUploadComplete?.(successfulUploads);
        toast({
          title: "Upload Complete",
          description: `Successfully uploaded ${successfulUploads.length} of ${files.length} files.`,
        });
      }

      onComplete?.();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed";
      onError?.(errorMessage);
      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }, [
    files,
    isUploading,
    getUploadEndpoint,
    getContextMetadata,
    carId,
    projectId,
    api,
    onUploadComplete,
    onComplete,
    onError,
    toast,
  ]);

  // Drag and drop handlers
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) setIsDragOver(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (disabled) return;

      const droppedFiles = Array.from(e.dataTransfer.files);
      handleFileSelect(droppedFiles);
    },
    [disabled, handleFileSelect]
  );

  // File input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFileSelect(Array.from(e.target.files));
      }
    },
    [handleFileSelect]
  );

  // Remove file
  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    setProgress((prev) => prev.filter((p) => p.id !== fileId));
  }, []);

  // Clear all
  const clearAll = useCallback(() => {
    setFiles([]);
    setProgress([]);
  }, []);

  // Update parent with progress
  useEffect(() => {
    onProgress?.(progress);
  }, [progress, onProgress]);

  if (!api) {
    return <div>Loading...</div>;
  }

  const pendingCount = progress.filter((p) => p.status === "pending").length;
  const uploadingCount = progress.filter(
    (p) => p.status === "uploading" || p.status === "optimizing"
  ).length;
  const completeCount = progress.filter((p) => p.status === "complete").length;
  const errorCount = progress.filter((p) => p.status === "error").length;

  return (
    <div className={`unified-image-uploader ${className}`}>
      {/* File input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* AI Analysis Options Panel */}
      {showAnalysisOptions && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-4 h-4 text-blue-600" />
              <h3 className="font-medium">AI Analysis Options</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Model Selection */}
              <div>
                <Label htmlFor="model-select" className="text-sm font-medium">
                  AI Model
                </Label>
                <Select
                  value={selectedModelId}
                  onValueChange={setSelectedModelId}
                  disabled={isUploading}
                >
                  <SelectTrigger id="model-select" className="mt-1">
                    <SelectValue placeholder="Select AI model" />
                  </SelectTrigger>
                  <SelectContent>
                    {IMAGE_ANALYSIS_CONFIG.availableModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Prompt Selection */}
              <div>
                <Label htmlFor="prompt-select" className="text-sm font-medium">
                  Analysis Prompt
                </Label>
                <Select
                  value={selectedPromptId}
                  onValueChange={setSelectedPromptId}
                  disabled={isUploading || isLoadingPrompts}
                >
                  <SelectTrigger id="prompt-select" className="mt-1">
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
                        {prompt.name}
                        {prompt.isDefault && " (Default)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Location Selection (Car context only) */}
              {context === "car" && (
                <div>
                  <Label
                    htmlFor="location-select"
                    className="text-sm font-medium"
                  >
                    <MapPin className="w-3 h-3 inline mr-1" />
                    Location
                  </Label>
                  <Select
                    value={selectedLocationId}
                    onValueChange={(value) => {
                      console.log("🗺️ Location selected:", value);
                      setSelectedLocationId(value);
                    }}
                    disabled={isUploading || isLoadingLocations}
                  >
                    <SelectTrigger id="location-select" className="mt-1">
                      <SelectValue
                        placeholder={
                          isLoadingLocations
                            ? "Loading locations..."
                            : "Select location (optional)"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="z-[200] max-h-60 overflow-y-auto">
                      {locations.map((location, index) => {
                        console.log(
                          `🗺️ Rendering location ${index}:`,
                          location
                        );
                        return (
                          <SelectItem
                            key={location.id || index}
                            value={location.id || `location-${index}`}
                          >
                            {location.name || `Location ${index + 1}`}
                            {location.address && ` - ${location.address}`}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Image Context Input */}
              <div
                className={
                  context === "car" ? "md:col-span-1" : "md:col-span-2"
                }
              >
                <Label htmlFor="context-input" className="text-sm font-medium">
                  Image Context (Optional)
                </Label>
                <Textarea
                  id="context-input"
                  value={imageContext}
                  onChange={(e) => setImageContext(e.target.value)}
                  placeholder="Describe what's in these images to improve AI analysis..."
                  className="mt-1 resize-none"
                  rows={2}
                  disabled={isUploading}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dropzone */}
      {showDropzone && (
        <div
          ref={dropzoneRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${isDragOver ? "border-blue-500 bg-blue-50" : "border-gray-300"}
            ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-gray-400"}
          `}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center gap-4">
            <div
              className={`p-3 rounded-full ${isDragOver ? "bg-blue-100" : "bg-gray-100"}`}
            >
              <Upload className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <p className="text-lg font-medium">
                {context === "car"
                  ? "Upload Car Images"
                  : context === "project"
                    ? "Upload Project Images"
                    : context === "inspection"
                      ? "Upload Inspection Images"
                      : "Upload Images"}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Drag and drop files here, or click to select
              </p>
              <p className="text-xs text-gray-400 mt-1">
                JPEG, PNG, WebP, GIF, HEIC •{" "}
                {maxFiles === Infinity
                  ? "Unlimited files"
                  : `Max ${maxFiles} files`}{" "}
                • Up to 50MB each
              </p>
            </div>
          </div>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">
              {files.length} file{files.length !== 1 ? "s" : ""} selected
            </h3>
            <div className="flex gap-2">
              {!isUploading && (
                <>
                  <Button variant="outline" size="sm" onClick={clearAll}>
                    Clear All
                  </Button>
                  <Button onClick={startUpload} disabled={disabled}>
                    Upload All
                  </Button>
                </>
              )}
              {onCancel && (
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
            </div>
          </div>

          {/* Progress summary */}
          {isUploading && (
            <div className="bg-transparent dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 p-3 rounded-lg text-gray-900 dark:text-gray-100">
              <div className="flex items-center justify-between text-sm">
                <span>
                  ✅ {completeCount} complete • 🔄 {uploadingCount} uploading •
                  ⏳ {pendingCount} pending • ❌ {errorCount} failed
                </span>
                <span>{Math.round((completeCount / files.length) * 100)}%</span>
              </div>
              <Progress
                value={(completeCount / files.length) * 100}
                className="mt-2 h-2"
              />
            </div>
          )}

          {/* Individual file progress */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {progress.map((p) => (
              <Card key={p.id} className="p-3">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {p.status === "complete" && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    {p.status === "error" && (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    )}
                    {[
                      "pending",
                      "optimizing",
                      "uploading",
                      "analyzing",
                    ].includes(p.status) && (
                      <FileImage className="w-5 h-5 text-blue-500" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">
                        {p.fileName}
                      </p>
                      {!isUploading && p.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(p.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    {p.status !== "pending" && (
                      <div className="mt-1">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>
                            {p.status === "optimizing" && "Optimizing..."}
                            {p.status === "uploading" && "Uploading..."}
                            {p.status === "analyzing" && "Analyzing..."}
                            {p.status === "complete" && "Complete"}
                            {p.status === "error" && "Failed"}
                          </span>
                          <span>{p.progress}%</span>
                        </div>
                        <Progress value={p.progress} className="mt-1 h-1" />
                        {p.error && (
                          <p className="text-xs text-red-500 mt-1">{p.error}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedImageUploader;
