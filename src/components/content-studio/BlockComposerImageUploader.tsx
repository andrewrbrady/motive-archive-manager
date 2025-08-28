"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Settings } from "lucide-react";
import { GallerySelectionModal } from "./GallerySelectionModal";
import { useProjectGalleries } from "@/hooks/useProjectGalleries";
import { useAPI } from "@/hooks/useAPI";
import UnifiedImageUploader from "@/components/UnifiedImageUploader";
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

// Legacy custom uploader removed in favor of UnifiedImageUploader

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
          const imageIds = uploadedImageData
            .map((img) => img._id)
            .filter((id) => id != null); // Filter out null/undefined IDs

          console.log("🔍 [GALLERY UPLOAD] Image IDs to add:", imageIds);
          console.log(
            "🔍 [GALLERY UPLOAD] Full image data:",
            uploadedImageData
          );

          if (imageIds.length === 0) {
            throw new Error("No valid image IDs found in uploaded data");
          }

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

            {/* Unified Image Uploader */}
            <UnifiedImageUploader
              context={projectId ? "project" : carId ? "car" : "content-studio"}
              projectId={projectId}
              carId={carId}
              metadata={uploadMetadata}
              showDropzone={true}
              showAnalysisOptions={true}
              onUploadComplete={(results) => {
                const toPublic = (url: string) => {
                  if (!url || !url.includes("imagedelivery.net")) return url;
                  const match = url.match(
                    /^(https:\/\/imagedelivery\.net\/[^\/]+\/[^\/]+)/
                  );
                  if (match) return `${match[1]}/public`;
                  // Fallback: if already has a variant, replace it with public
                  const parts = url.split("/");
                  parts[parts.length - 1] = "public";
                  return parts.join("/");
                };
                const normalized = results.map((r) => ({
                  ...r,
                  url: toPublic(r.url),
                }));
                handleUploadComplete(
                  normalized.map((r) => r.url),
                  normalized
                );
              }}
              onError={(error) => {
                toast({
                  title: "Upload Error",
                  description: error,
                  variant: "destructive",
                });
              }}
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
