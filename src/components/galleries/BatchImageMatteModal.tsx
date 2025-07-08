import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Cloud,
  Monitor,
  Palette,
  Check,
  X,
  Eye,
  RefreshCw,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Progress } from "@/components/ui/progress";
import { useGalleryImageProcessing } from "@/lib/hooks/useGalleryImageProcessing";
import Image from "next/image";

interface BatchImageMatteModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: any[];
  galleryId: string;
  onBatchProcessingComplete: () => void;
  onImageProcessed?: (originalImageId: string, newImageData: any) => void;
}

type ProcessingStage = "settings" | "preview" | "replacing";

interface ProcessingStatus {
  imageId: string;
  filename: string;
  status: "pending" | "processing" | "completed" | "error";
  error?: string;
  previewUrl?: string;
  originalUrl?: string;
}

export function BatchImageMatteModal({
  isOpen,
  onClose,
  images,
  galleryId,
  onBatchProcessingComplete,
  onImageProcessed,
}: BatchImageMatteModalProps) {
  const [canvasWidth, setCanvasWidth] = useState<string>("1920");
  const [canvasHeight, setCanvasHeight] = useState<string>("1080");
  const [paddingPercent, setPaddingPercent] = useState<string>("0");
  const [matteColor, setMatteColor] = useState<string>("#000000");
  const [cloudflareWidth, setCloudflareWidth] = useState<string>("2000");
  const [cloudflareQuality, setCloudflareQuality] = useState<string>("100");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  const [processingStatuses, setProcessingStatuses] = useState<
    ProcessingStatus[]
  >([]);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState(0);
  const [stage, setStage] = useState<ProcessingStage>("settings");

  const { previewProcessImage, replaceImageInGallery } =
    useGalleryImageProcessing();

  // Initialize processing statuses when images change
  useEffect(() => {
    if (images.length > 0) {
      setProcessingStatuses(
        images.map((image) => ({
          imageId: image._id,
          filename: image.filename || "Unknown",
          status: "pending",
          originalUrl: image.url,
        }))
      );
      setCurrentProcessingIndex(0);
      setStage("settings");
    }
  }, [images]);

  // Helper function to build enhanced Cloudflare URL
  const getEnhancedImageUrl = (
    baseUrl: string,
    width?: string,
    quality?: string
  ) => {
    let params = [];
    if (width && width.trim() !== "") params.push(`w=${width}`);
    if (quality && quality.trim() !== "") params.push(`q=${quality}`);

    if (params.length === 0) return baseUrl;

    if (baseUrl.includes("imagedelivery.net")) {
      const urlParts = baseUrl.split("/");
      urlParts[urlParts.length - 1] = params.join(",");
      return urlParts.join("/");
    }

    return baseUrl.replace(/\/public$/, `/${params.join(",")}`);
  };

  const updateProcessingStatus = (
    imageId: string,
    status: ProcessingStatus["status"],
    error?: string,
    previewUrl?: string
  ) => {
    setProcessingStatuses((prev) =>
      prev.map((item) =>
        item.imageId === imageId ? { ...item, status, error, previewUrl } : item
      )
    );
  };

  const handlePreviewBatch = async () => {
    if (images.length === 0) return;

    setIsProcessing(true);
    setStage("preview");
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      setCurrentProcessingIndex(i);

      updateProcessingStatus(image._id, "processing");

      try {
        const enhancedImageUrl = getEnhancedImageUrl(
          image.url,
          cloudflareWidth,
          cloudflareQuality
        );

        const parameters = {
          imageUrl: enhancedImageUrl,
          canvasWidth: parseInt(canvasWidth),
          canvasHeight: parseInt(canvasHeight),
          paddingPercent: parseFloat(paddingPercent),
          matteColor,

          requestedWidth: parseInt(canvasWidth),
          requestedHeight: parseInt(canvasHeight),
          scaleMultiplier: 1,
        };

        const result = await previewProcessImage({
          galleryId,
          imageId: image._id,
          processingType: "image-matte",
          parameters,
        });

        if (result && result.processingResult?.processedImageUrl) {
          updateProcessingStatus(
            image._id,
            "completed",
            undefined,
            result.processingResult.processedImageUrl
          );
          successCount++;
        } else {
          throw new Error("Preview generation failed");
        }
      } catch (error) {
        console.error(`Failed to preview image ${image._id}:`, error);
        updateProcessingStatus(
          image._id,
          "error",
          error instanceof Error ? error.message : "Unknown error"
        );
        errorCount++;
      }

      // Small delay between processing to prevent overwhelming the server
      if (i < images.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    setIsProcessing(false);

    // Show completion toast
    if (successCount > 0 && errorCount === 0) {
      toast({
        title: "Preview Generation Complete",
        description: `Successfully generated previews for ${successCount} image${successCount !== 1 ? "s" : ""}`,
      });
    } else if (successCount > 0 && errorCount > 0) {
      toast({
        title: "Preview Generation Completed with Errors",
        description: `${successCount} successful, ${errorCount} failed`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Preview Generation Failed",
        description: `Failed to generate previews for ${errorCount} image${errorCount !== 1 ? "s" : ""}`,
        variant: "destructive",
      });
    }
  };

  const handleReplaceAll = async () => {
    const successfulPreviews = processingStatuses.filter(
      (status) => status.status === "completed" && status.previewUrl
    );

    if (successfulPreviews.length === 0) {
      toast({
        title: "No Previews to Replace",
        description: "No successful previews available for replacement",
        variant: "destructive",
      });
      return;
    }

    setIsReplacing(true);
    setStage("replacing");
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < successfulPreviews.length; i++) {
      const status = successfulPreviews[i];
      setCurrentProcessingIndex(i);

      updateProcessingStatus(status.imageId, "processing");

      try {
        const enhancedImageUrl = getEnhancedImageUrl(
          status.originalUrl!,
          cloudflareWidth,
          cloudflareQuality
        );

        const parameters = {
          imageUrl: enhancedImageUrl,
          canvasWidth: parseInt(canvasWidth),
          canvasHeight: parseInt(canvasHeight),
          paddingPercent: parseFloat(paddingPercent),
          matteColor,

          requestedWidth: parseInt(canvasWidth),
          requestedHeight: parseInt(canvasHeight),
          scaleMultiplier: 1,
        };

        const result = await replaceImageInGallery(
          galleryId,
          status.imageId,
          "image-matte",
          parameters
        );

        if (result) {
          updateProcessingStatus(status.imageId, "completed");
          successCount++;

          if (onImageProcessed) {
            onImageProcessed(result.originalImageId, result.processedImage);
          }
        } else {
          throw new Error("Replacement failed");
        }
      } catch (error) {
        console.error(`Failed to replace image ${status.imageId}:`, error);
        updateProcessingStatus(
          status.imageId,
          "error",
          error instanceof Error ? error.message : "Unknown error"
        );
        errorCount++;
      }

      // Small delay between processing
      if (i < successfulPreviews.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    setIsReplacing(false);

    // Show completion toast
    if (successCount > 0 && errorCount === 0) {
      toast({
        title: "Batch Replacement Complete",
        description: `Successfully replaced ${successCount} image${successCount !== 1 ? "s" : ""}`,
      });
      setTimeout(() => {
        handleClose();
      }, 2000);
    } else if (successCount > 0 && errorCount > 0) {
      toast({
        title: "Batch Replacement Completed with Errors",
        description: `${successCount} successful, ${errorCount} failed`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Batch Replacement Failed",
        description: `Failed to replace ${errorCount} image${errorCount !== 1 ? "s" : ""}`,
        variant: "destructive",
      });
    }
  };

  const handleStartOver = () => {
    setStage("settings");
    setProcessingStatuses(
      images.map((image) => ({
        imageId: image._id,
        filename: image.filename || "Unknown",
        status: "pending",
        originalUrl: image.url,
      }))
    );
    setCurrentProcessingIndex(0);
  };

  const handleClose = () => {
    if (!isProcessing && !isReplacing) {
      setCanvasWidth("1920");
      setCanvasHeight("1080");
      setPaddingPercent("0");
      setMatteColor("#000000");
      setCloudflareWidth("2000");
      setCloudflareQuality("100");
      setProcessingStatuses([]);
      setCurrentProcessingIndex(0);
      setStage("settings");
      onBatchProcessingComplete();
      onClose();
    }
  };

  const completedCount = processingStatuses.filter(
    (s) => s.status === "completed"
  ).length;
  const errorCount = processingStatuses.filter(
    (s) => s.status === "error"
  ).length;
  const progressPercentage =
    images.length > 0
      ? ((completedCount + errorCount) / images.length) * 100
      : 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Batch Image Matte
            {stage === "preview" && " - Preview"}
            {stage === "replacing" && " - Replacing"}
          </DialogTitle>
          <DialogDescription>
            {stage === "settings" &&
              `Configure image matte settings for ${images.length} selected image${images.length !== 1 ? "s" : ""}`}
            {stage === "preview" &&
              `Review processed previews before replacing original images`}
            {stage === "replacing" &&
              `Replacing original images with processed versions`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Settings Stage */}
          {stage === "settings" && (
            <>
              {/* Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cloudflare Image Quality Controls */}
                <div className="p-3 border rounded-lg bg-muted/30">
                  <Label className="text-sm font-medium mb-2 block">
                    Original Image Quality
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="cloudflareWidth" className="text-xs">
                        Width (px)
                      </Label>
                      <Input
                        id="cloudflareWidth"
                        type="number"
                        value={cloudflareWidth}
                        onChange={(e) => setCloudflareWidth(e.target.value)}
                        placeholder="2000"
                        min="100"
                        max="5000"
                        className="text-sm"
                        disabled={isProcessing}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cloudflareQuality" className="text-xs">
                        Quality (%)
                      </Label>
                      <Input
                        id="cloudflareQuality"
                        type="number"
                        value={cloudflareQuality}
                        onChange={(e) => setCloudflareQuality(e.target.value)}
                        placeholder="100"
                        min="1"
                        max="100"
                        className="text-sm"
                        disabled={isProcessing}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Canvas Dimensions */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="canvasWidth">Canvas Width (px)</Label>
                  <Input
                    id="canvasWidth"
                    type="number"
                    value={canvasWidth}
                    onChange={(e) => setCanvasWidth(e.target.value)}
                    placeholder="1920"
                    min="100"
                    max="5000"
                    disabled={isProcessing}
                  />
                </div>
                <div>
                  <Label htmlFor="canvasHeight">Canvas Height (px)</Label>
                  <Input
                    id="canvasHeight"
                    type="number"
                    value={canvasHeight}
                    onChange={(e) => setCanvasHeight(e.target.value)}
                    placeholder="1080"
                    min="100"
                    max="5000"
                    disabled={isProcessing}
                  />
                </div>
              </div>

              {/* Aspect Ratio Preset Buttons */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCanvasWidth("1080");
                    setCanvasHeight("1920");
                  }}
                  className="text-xs"
                  disabled={isProcessing}
                >
                  9:16 (1080×1920)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCanvasWidth("1080");
                    setCanvasHeight("1350");
                  }}
                  className="text-xs"
                  disabled={isProcessing}
                >
                  4:5 (1080×1350)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCanvasWidth("1080");
                    setCanvasHeight("1080");
                  }}
                  className="text-xs"
                  disabled={isProcessing}
                >
                  1:1 (1080×1080)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCanvasWidth("1920");
                    setCanvasHeight("1080");
                  }}
                  className="text-xs"
                  disabled={isProcessing}
                >
                  16:9 (1920×1080)
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="paddingPercent">Padding Percentage</Label>
                  <Input
                    id="paddingPercent"
                    type="number"
                    step="0.1"
                    value={paddingPercent}
                    onChange={(e) => setPaddingPercent(e.target.value)}
                    placeholder="0"
                    min="0"
                    max="50"
                    disabled={isProcessing}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Percentage of canvas to use as padding around the image
                  </p>
                </div>

                <div>
                  <Label
                    htmlFor="matteColor"
                    className="flex items-center gap-2"
                  >
                    <Palette className="h-4 w-4" />
                    Matte Color
                  </Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="matteColor"
                      type="color"
                      value={matteColor}
                      onChange={(e) => setMatteColor(e.target.value)}
                      className="w-16 h-10 p-1 border rounded"
                      disabled={isProcessing}
                    />
                    <Input
                      type="text"
                      value={matteColor}
                      onChange={(e) => setMatteColor(e.target.value)}
                      placeholder="#000000"
                      className="flex-1"
                      disabled={isProcessing}
                    />
                  </div>
                  <div className="flex gap-1 mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setMatteColor("#000000")}
                      className="text-xs"
                      disabled={isProcessing}
                    >
                      Black
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setMatteColor("#FFFFFF")}
                      className="text-xs"
                      disabled={isProcessing}
                    >
                      White
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setMatteColor("#808080")}
                      className="text-xs"
                      disabled={isProcessing}
                    >
                      Gray
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Preview Stage */}
          {stage === "preview" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {processingStatuses.map((status) => (
                  <div
                    key={status.imageId}
                    className="border rounded-lg p-3 space-y-2"
                  >
                    <div className="text-sm font-medium truncate">
                      {status.filename}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {/* Original Image */}
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">
                          Original
                        </div>
                        <div className="relative aspect-square bg-muted rounded overflow-hidden">
                          <Image
                            src={status.originalUrl!}
                            alt="Original"
                            fill
                            className="object-contain"
                            sizes="150px"
                          />
                        </div>
                      </div>

                      {/* Processed Image */}
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">
                          Processed
                        </div>
                        <div className="relative aspect-square bg-muted rounded overflow-hidden">
                          {status.previewUrl ? (
                            <Image
                              src={status.previewUrl}
                              alt="Processed"
                              fill
                              className="object-contain"
                              sizes="150px"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                              {status.status === "processing" && (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              )}
                              {status.status === "pending" && "Pending"}
                              {status.status === "error" && "Error"}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-2 text-xs">
                      {status.status === "pending" && (
                        <span className="text-muted-foreground">Pending</span>
                      )}
                      {status.status === "processing" && (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin text-purple-500" />
                          <span className="text-purple-600">Processing...</span>
                        </>
                      )}
                      {status.status === "completed" && (
                        <>
                          <Check className="h-3 w-3 text-green-500" />
                          <span className="text-green-600">Ready</span>
                        </>
                      )}
                      {status.status === "error" && (
                        <>
                          <X className="h-3 w-3 text-red-500" />
                          <span className="text-red-600" title={status.error}>
                            Error
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progress Section */}
          {(isProcessing || isReplacing) && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>
                    {isProcessing && "Processing Progress"}
                    {isReplacing && "Replacement Progress"}
                  </span>
                  <span>
                    {completedCount + errorCount} / {images.length}
                  </span>
                </div>
                <Progress value={progressPercentage} className="w-full" />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between">
            <div>
              {stage === "preview" && (
                <Button
                  variant="outline"
                  onClick={handleStartOver}
                  disabled={isProcessing || isReplacing}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Start Over
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isProcessing || isReplacing}
              >
                {isProcessing || isReplacing ? "Processing..." : "Cancel"}
              </Button>

              {stage === "settings" && (
                <Button
                  onClick={handlePreviewBatch}
                  disabled={isProcessing || images.length === 0}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Previews...
                    </>
                  ) : (
                    <>
                      <Eye className="mr-2 h-4 w-4" />
                      Generate Previews ({images.length})
                    </>
                  )}
                </Button>
              )}

              {stage === "preview" && (
                <Button
                  onClick={handleReplaceAll}
                  disabled={isReplacing || completedCount === 0}
                >
                  {isReplacing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Replacing...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Replace All ({completedCount})
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
