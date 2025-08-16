"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Settings, Upload } from "lucide-react";
import { GallerySelectionModal } from "./GallerySelectionModal";
import { useProjectGalleries } from "@/hooks/useProjectGalleries";
import { useAPI } from "@/hooks/useAPI";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ImageAnalysisPrompt {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  isDefault: boolean;
}

const IMAGE_ANALYSIS_CONFIG = {
  availableModels: [
    { id: "gpt-4o", label: "GPT-4o (Recommended)", isDefault: false },
    { id: "gpt-4o-mini", label: "GPT-4o Mini (Fast)", isDefault: true },
    { id: "gpt-4-vision-preview", label: "GPT-4 Vision", isDefault: false },
  ],
};

// Custom drag & drop uploader component for BlockComposer
interface CustomImageUploaderProps {
  onUploadComplete: (imageUrls: string[], imageData?: any[]) => void;
  metadata: Record<string, any>;
  carId?: string;
}

function CustomImageUploader({
  onUploadComplete,
  metadata,
  carId,
}: CustomImageUploaderProps) {
  const { toast } = useToast();
  const api = useAPI();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList) => {
      if (!api || !files.length) return;

      setIsUploading(true);
      const uploadedUrls: string[] = [];
      const uploadedData: any[] = [];

      try {
        for (const file of Array.from(files)) {
          const formData = new FormData();
          formData.append("files", file);
          formData.append("metadata", JSON.stringify(metadata));
          if (carId) {
            formData.append("carId", carId);
          }

          // Use project-specific endpoint if projectId exists, otherwise fallback to general endpoint
          const endpoint = metadata.projectId
            ? `/api/projects/${metadata.projectId}/images`
            : "/api/cloudflare/images";

          const response = (await api.upload(endpoint, formData)) as {
            success: boolean;
            images?: Array<{ url: string; metadata?: any }>;
            uploadedImages?: Array<{
              _id: string;
              url: string;
              metadata?: any;
            }>;
            error?: string;
          };

          if (response.success) {
            // Handle project endpoint response format
            if (response.uploadedImages && response.uploadedImages.length > 0) {
              uploadedUrls.push(response.uploadedImages[0].url);
              uploadedData.push(...response.uploadedImages);
            }
            // Handle general endpoint response format
            else if (response.images && response.images.length > 0) {
              uploadedUrls.push(response.images[0].url);
              uploadedData.push(...response.images);
            } else {
              throw new Error("No images in response");
            }
          } else {
            throw new Error(response.error || "Upload failed");
          }
        }

        onUploadComplete(uploadedUrls, uploadedData);
      } catch (error) {
        console.error("Upload error:", error);
        toast({
          title: "Upload Error",
          description: "Failed to upload images",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
      }
    },
    [api, metadata, carId, onUploadComplete, toast]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFiles(files);
      }
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files) {
        handleFiles(files);
      }
    },
    [handleFiles]
  );

  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
        dragActive
          ? "border-primary bg-primary/5"
          : "border-border hover:border-border/80",
        isUploading && "pointer-events-none opacity-50"
      )}
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
        disabled={isUploading}
      />

      <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
      <p className="text-lg font-medium text-foreground mb-2">
        {isUploading ? "Uploading..." : "Upload Images"}
      </p>
      <p className="text-sm text-muted-foreground">
        Drag and drop images here, or click to select files
      </p>
      <p className="text-xs text-muted-foreground mt-2">
        Supports JPG, PNG, GIF, WebP up to 8MB each
      </p>
    </div>
  );
}

interface BlockComposerImageUploaderProps {
  projectId?: string;
  carId?: string;
  onImagesUploaded?: (images: { url: string; galleryId: string }[]) => void;
  className?: string;
}

export function BlockComposerImageUploader({
  projectId,
  carId,
  onImagesUploaded,
  className = "",
}: BlockComposerImageUploaderProps) {
  const { toast } = useToast();
  const api = useAPI();

  // State management
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [uploadedImageData, setUploadedImageData] = useState<any[]>([]);

  // AI Analysis settings
  const [selectedPromptId, setSelectedPromptId] = useState<string>("");
  const [selectedModelId, setSelectedModelId] = useState<string>(
    IMAGE_ANALYSIS_CONFIG.availableModels.find((m) => m.isDefault)?.id ||
      "gpt-4o-mini"
  );
  const [availablePrompts, setAvailablePrompts] = useState<
    ImageAnalysisPrompt[]
  >([]);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);

  // Gallery management (only for projects)
  const {
    galleries,
    availableGalleries,
    isLoading: galleriesLoading,
    createGallery,
    linkGallery,
    refetchGalleries,
  } = useProjectGalleries(projectId);

  // Load available prompts
  useEffect(() => {
    const loadPrompts = async () => {
      if (!api) return;

      setIsLoadingPrompts(true);
      try {
        const data = (await api.get(
          "admin/image-analysis-prompts/active"
        )) as ImageAnalysisPrompt[];
        setAvailablePrompts(data || []);

        // Set default prompt if available
        const defaultPrompt = data?.find(
          (p: ImageAnalysisPrompt) => p.isDefault
        );
        if (defaultPrompt) {
          setSelectedPromptId(defaultPrompt._id);
        }
      } catch (error) {
        console.error("Failed to load prompts:", error);
      } finally {
        setIsLoadingPrompts(false);
      }
    };

    loadPrompts();
  }, [api]);

  // Handle upload completion from ImageUploader
  const handleUploadComplete = useCallback(
    (imageUrls: string[], imageData?: any[]) => {
      setUploadedImageUrls(imageUrls);
      setUploadedImageData(imageData || []);

      // For direct car uploads (no project), immediately notify parent
      if (!projectId) {
        const results = imageUrls.map((url) => ({
          url,
          galleryId: "", // No gallery for direct car uploads
        }));
        onImagesUploaded?.(results);
        setIsUploadDialogOpen(false);
        toast({
          title: "Success",
          description: `${imageUrls.length} image(s) uploaded and added to composition`,
        });
        return;
      }

      // For project uploads, show gallery selection if galleries exist
      if (galleries.length > 0 || availableGalleries.length > 0) {
        setShowGalleryModal(true);
      } else {
        // No galleries - need to create one first
        toast({
          title: "Upload Complete",
          description: "Create a gallery to organize your images",
        });
        setShowGalleryModal(true);
      }
    },
    [
      projectId,
      galleries.length,
      availableGalleries.length,
      onImagesUploaded,
      toast,
    ]
  );

  // Handle gallery selection/creation
  const handleGalleryUpload = useCallback(
    async (galleryId: string) => {
      try {
        // If we have uploaded image data with IDs, add them to the gallery
        if (uploadedImageData.length > 0 && api) {
          const imageIds = uploadedImageData.map((img) => img._id);

          // Add images to gallery via API
          await api.patch(`/galleries/${galleryId}/add-images`, {
            imageIds,
          });
        }

        const results = uploadedImageUrls.map((url) => ({
          url,
          galleryId,
        }));
        onImagesUploaded?.(results);
        setShowGalleryModal(false);
        setIsUploadDialogOpen(false);
        toast({
          title: "Success",
          description: `${uploadedImageUrls.length} image(s) added to gallery and composition`,
        });
      } catch (error) {
        console.error("Gallery upload error:", error);
        toast({
          title: "Error",
          description: "Failed to add images to gallery",
          variant: "destructive",
        });
      }
    },
    [uploadedImageUrls, uploadedImageData, onImagesUploaded, toast, api]
  );

  const handleCreateAndUpload = useCallback(
    async (galleryData: { name: string; description: string }) => {
      try {
        const newGallery = await createGallery(galleryData);
        if (newGallery) {
          await handleGalleryUpload(newGallery._id);
        }
      } catch (error) {
        console.error("Create gallery error:", error);
        toast({
          title: "Error",
          description: "Failed to create gallery",
          variant: "destructive",
        });
      }
    },
    [createGallery, handleGalleryUpload, toast]
  );

  const handleLinkAndUpload = useCallback(
    async (galleryId: string) => {
      try {
        await linkGallery(galleryId);
        await handleGalleryUpload(galleryId);
      } catch (error) {
        console.error("Link gallery error:", error);
        toast({
          title: "Error",
          description: "Failed to link gallery",
          variant: "destructive",
        });
      }
    },
    [linkGallery, handleGalleryUpload, toast]
  );

  // Build metadata for ImageUploader
  const uploadMetadata = {
    uploadedFrom: "block-composer",
    projectId,
    ...(selectedPromptId &&
      selectedPromptId !== "__default__" && {
        analysisPromptId: selectedPromptId,
      }),
    ...(selectedModelId && { analysisModelId: selectedModelId }),
  };

  const isLoading = galleriesLoading || isLoadingPrompts;

  return (
    <>
      {/* Upload Images Button & Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogTrigger asChild>
          <Button className={`h-10 px-4 ${className}`} size="default">
            <Plus className="h-4 w-4 mr-2" />
            Upload Images
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col bg-background border-border">
          <DialogHeader className="border-b border-border pb-4">
            <DialogTitle className="text-foreground">
              Upload Images to BlockComposer
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Upload images with AI analysis for your composition.
              {projectId && " You'll select a gallery after upload."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-6 space-y-6">
            {/* AI Settings Panel */}
            <Collapsible defaultOpen>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-foreground">
                  AI Analysis Settings
                </h3>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>
              </div>

              <CollapsibleContent className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-muted/20 rounded-lg border border-border">
                  {/* Model Selection */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-foreground">
                      AI Model
                    </Label>
                    <Select
                      value={selectedModelId}
                      onValueChange={setSelectedModelId}
                    >
                      <SelectTrigger className="h-11 bg-background border-border text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-border">
                        {IMAGE_ANALYSIS_CONFIG.availableModels.map((model) => (
                          <SelectItem
                            key={model.id}
                            value={model.id}
                            className="text-foreground"
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{model.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Prompt Selection */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-foreground">
                      Analysis Prompt
                    </Label>
                    <Select
                      value={selectedPromptId}
                      onValueChange={setSelectedPromptId}
                      disabled={isLoadingPrompts}
                    >
                      <SelectTrigger className="h-11 bg-background border-border text-foreground">
                        <SelectValue
                          placeholder={
                            isLoadingPrompts
                              ? "Loading prompts..."
                              : "Select analysis prompt"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent className="max-w-[400px] bg-background border-border">
                        <SelectItem
                          value="__default__"
                          className="text-foreground"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">
                              Default Analysis
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Standard image analysis
                            </span>
                          </div>
                        </SelectItem>
                        {availablePrompts.map((prompt) => (
                          <SelectItem
                            key={prompt._id}
                            value={prompt._id}
                            className="text-foreground"
                          >
                            <div className="flex flex-col py-1">
                              <span className="font-medium">{prompt.name}</span>
                              {prompt.description && (
                                <span className="text-xs text-muted-foreground max-w-[300px]">
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
              </CollapsibleContent>
            </Collapsible>

            {/* Custom Drag & Drop Uploader */}
            <CustomImageUploader
              onUploadComplete={handleUploadComplete}
              metadata={uploadMetadata}
              carId={carId}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Gallery Selection Modal (for projects) */}
      {projectId && (
        <GallerySelectionModal
          open={showGalleryModal}
          onOpenChange={setShowGalleryModal}
          projectGalleries={galleries}
          availableGalleries={availableGalleries}
          selectedFiles={uploadedImageUrls.map((url) => new File([], url))} // Mock files for display
          onUploadToGallery={handleGalleryUpload}
          onCreateAndUpload={handleCreateAndUpload}
          onLinkAndUpload={handleLinkAndUpload}
          isUploading={false}
        />
      )}
    </>
  );
}
