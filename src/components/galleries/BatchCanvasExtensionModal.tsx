import React, { useState, useEffect } from "react";
import { ImageData } from "@/app/images/columns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Loader2,
  Check,
  X,
  Eye,
  AlertCircle,
  CheckCircle,
  Pause,
  Play,
  Expand,
  RefreshCw,
  Zap,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { toast as hotToast } from "react-hot-toast";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGalleryImageProcessing } from "@/lib/hooks/useGalleryImageProcessing";
import Image from "next/image";

interface BatchCanvasExtensionModalProps {
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

export function BatchCanvasExtensionModal({
  isOpen,
  onClose,
  images,
  galleryId,
  onBatchProcessingComplete,
  onImageProcessed,
}: BatchCanvasExtensionModalProps) {
  const [desiredHeight, setDesiredHeight] = useState<string>("1200");
  const [paddingPct, setPaddingPct] = useState<string>("0.05");
  const [whiteThresh, setWhiteThresh] = useState<string>("90");
  const [cloudflareWidth, setCloudflareWidth] = useState<string>("2000");
  const [cloudflareQuality, setCloudflareQuality] = useState<string>("100");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  const [isReplacing2x, setIsReplacing2x] = useState(false);
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
          desiredHeight: parseInt(desiredHeight),
          paddingPct: parseFloat(paddingPct),
          whiteThresh: whiteThresh === "-1" ? -1 : parseInt(whiteThresh),

          requestedWidth: Math.round((parseInt(desiredHeight) * 16) / 9), // Default aspect ratio
          requestedHeight: parseInt(desiredHeight),
          scaleMultiplier: 1,
        };

        const result = await previewProcessImage({
          galleryId,
          imageId: image._id,
          processingType: "canvas-extension",
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

  // Wait for image availability with retry mechanism
  const waitForImageAvailability = async (
    imageUrl: string,
    maxRetries: number = 10,
    delayMs: number = 1000
  ) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await new Promise<void>((resolve, reject) => {
          // Check if we're in browser environment
          if (typeof window === "undefined") {
            reject(new Error("Not in browser environment"));
            return;
          }

          const img = new window.Image();
          img.onload = () => {
            resolve();
          };
          img.onerror = () => {
            reject(new Error(`Image not available (attempt ${attempt})`));
          };
          // Add cache-busting parameter
          img.src = `${imageUrl}?v=${Date.now()}`;
        });

        // Image loaded successfully
        return true;
      } catch (error) {
        if (attempt === maxRetries) {
          console.warn("⚠️ Max retries reached, but proceeding anyway");
          return false;
        }

        // Wait before next attempt
        await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
      }
    }
    return false;
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
    const processedImages: { originalImageId: string; newImageData: any }[] =
      [];

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
          desiredHeight: parseInt(desiredHeight),
          paddingPct: parseFloat(paddingPct),
          whiteThresh: whiteThresh === "-1" ? -1 : parseInt(whiteThresh),

          requestedWidth: Math.round((parseInt(desiredHeight) * 16) / 9), // Default aspect ratio
          requestedHeight: parseInt(desiredHeight),
          scaleMultiplier: 1,
        };

        const result = await replaceImageInGallery(
          galleryId,
          status.imageId,
          "canvas-extension",
          parameters
        );

        if (result) {
          updateProcessingStatus(status.imageId, "completed");
          successCount++;

          // Collect processed images instead of calling onImageProcessed immediately
          processedImages.push({
            originalImageId: result.originalImageId,
            newImageData: result.processedImage,
          });
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
        await new Promise<void>((resolve) => setTimeout(resolve, 500));
      }
    }

    setIsReplacing(false);

    // Process all successful images at once to avoid multiple refreshes
    if (processedImages.length > 0 && onImageProcessed) {
      // Call onImageProcessed for each image (TODO: Add image availability waiting later)
      for (const processedImage of processedImages) {
        onImageProcessed(
          processedImage.originalImageId,
          processedImage.newImageData
        );
      }
    }

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

  const handleReplaceAll2x = async () => {
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

    setIsReplacing2x(true);
    setStage("replacing");
    let successCount = 0;
    let errorCount = 0;
    const processedImages: { originalImageId: string; newImageData: any }[] =
      [];

    for (let i = 0; i < successfulPreviews.length; i++) {
      const status = successfulPreviews[i];
      setCurrentProcessingIndex(i);

      updateProcessingStatus(status.imageId, "processing");

      try {
        // Use 2x multiplier for high-resolution processing
        const multiplier = 2;
        const highResCloudflareWidth = parseInt(cloudflareWidth) * multiplier;

        const enhancedImageUrl = getEnhancedImageUrl(
          status.originalUrl!,
          highResCloudflareWidth.toString(), // Use higher resolution source
          cloudflareQuality
        );

        // For 2x, scale the desired height by multiplier to get true high-res
        const targetHeight = parseInt(desiredHeight) * multiplier;

        const parameters = {
          imageUrl: enhancedImageUrl,
          desiredHeight: targetHeight,
          paddingPct: parseFloat(paddingPct),
          whiteThresh: whiteThresh === "-1" ? -1 : parseInt(whiteThresh),

          requestedWidth: Math.round((parseInt(desiredHeight) * 16) / 9), // Use original requested dimensions
          requestedHeight: parseInt(desiredHeight), // Use original requested dimensions
          scaleMultiplier: multiplier,
        };

        const result = await replaceImageInGallery(
          galleryId,
          status.imageId,
          "canvas-extension",
          parameters
        );

        if (result) {
          updateProcessingStatus(status.imageId, "completed");
          successCount++;

          // Collect processed images instead of calling onImageProcessed immediately
          processedImages.push({
            originalImageId: result.originalImageId,
            newImageData: result.processedImage,
          });
        } else {
          throw new Error("2x Replacement failed");
        }
      } catch (error) {
        console.error(
          `Failed to replace image ${status.imageId} with 2x:`,
          error
        );
        updateProcessingStatus(
          status.imageId,
          "error",
          error instanceof Error ? error.message : "Unknown error"
        );
        errorCount++;
      }

      // Small delay between processing
      if (i < successfulPreviews.length - 1) {
        await new Promise<void>((resolve) => setTimeout(resolve, 500));
      }
    }

    setIsReplacing2x(false);

    // Process all successful images at once to avoid multiple refreshes
    if (processedImages.length > 0 && onImageProcessed) {
      // Call onImageProcessed for each image (TODO: Add image availability waiting later)
      for (const processedImage of processedImages) {
        onImageProcessed(
          processedImage.originalImageId,
          processedImage.newImageData
        );
      }
    }

    // Show completion toast
    if (successCount > 0 && errorCount === 0) {
      toast({
        title: "Batch 2x Replacement Complete",
        description: `Successfully replaced ${successCount} image${successCount !== 1 ? "s" : ""} with 2x resolution`,
      });
      setTimeout(() => {
        handleClose();
      }, 2000);
    } else if (successCount > 0 && errorCount > 0) {
      toast({
        title: "Batch 2x Replacement Completed with Errors",
        description: `${successCount} successful, ${errorCount} failed`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Batch 2x Replacement Failed",
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
    if (!isProcessing && !isReplacing && !isReplacing2x) {
      setDesiredHeight("1200");
      setPaddingPct("0.05");
      setWhiteThresh("90");
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
            <Expand className="h-5 w-5" />
            Batch Canvas Extension
            {stage === "preview" && " - Preview"}
            {stage === "replacing" && " - Replacing"}
          </DialogTitle>
          <DialogDescription>
            {stage === "settings" &&
              `Configure canvas extension settings for ${images.length} selected image${images.length !== 1 ? "s" : ""}`}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="desiredHeight">Desired Height (pixels)</Label>
                  <Input
                    id="desiredHeight"
                    type="number"
                    value={desiredHeight}
                    onChange={(e) => setDesiredHeight(e.target.value)}
                    placeholder="1200"
                    min="100"
                    max="5000"
                    disabled={isProcessing}
                  />

                  {/* Aspect Ratio Preset Buttons */}
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDesiredHeight("1920");
                        setCloudflareWidth("1080");
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
                        setDesiredHeight("1350");
                        setCloudflareWidth("1080");
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
                        setDesiredHeight("1080");
                        setCloudflareWidth("1080");
                      }}
                      className="text-xs"
                      disabled={isProcessing}
                    >
                      1:1 (1080×1080)
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="paddingPct">Padding Percentage</Label>
                  <Input
                    id="paddingPct"
                    type="number"
                    step="0.01"
                    value={paddingPct}
                    onChange={(e) => setPaddingPct(e.target.value)}
                    placeholder="0.05"
                    min="0"
                    max="1"
                    disabled={isProcessing}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="whiteThresh" className="block mb-3">
                  White Threshold
                </Label>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <Slider
                        value={[
                          whiteThresh === "-1" ? 90 : parseInt(whiteThresh),
                        ]}
                        onValueChange={(value) =>
                          setWhiteThresh(value[0].toString())
                        }
                        max={255}
                        min={0}
                        step={1}
                        className="w-full"
                        disabled={whiteThresh === "-1" || isProcessing}
                      />
                    </div>
                    <Button
                      type="button"
                      variant={whiteThresh === "-1" ? "default" : "outline"}
                      size="sm"
                      onClick={() =>
                        setWhiteThresh(whiteThresh === "-1" ? "90" : "-1")
                      }
                      className="px-3"
                      disabled={isProcessing}
                    >
                      Auto
                    </Button>
                  </div>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>0 (Black)</span>
                    <span className="font-medium">
                      {whiteThresh === "-1"
                        ? "Auto-detection"
                        : `Value: ${whiteThresh}`}
                    </span>
                    <span>255 (White)</span>
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
                          <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                          <span className="text-blue-600">Processing...</span>
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
          {(isProcessing || isReplacing || isReplacing2x) && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>
                    {isProcessing && "Processing Progress"}
                    {isReplacing && "Replacement Progress"}
                    {isReplacing2x && "2x Replacement Progress"}
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
                  disabled={isProcessing || isReplacing || isReplacing2x}
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
                disabled={isProcessing || isReplacing || isReplacing2x}
              >
                {isProcessing || isReplacing || isReplacing2x
                  ? "Processing..."
                  : "Cancel"}
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
                  disabled={
                    isReplacing || isReplacing2x || completedCount === 0
                  }
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

              {stage === "preview" && (
                <Button
                  onClick={handleReplaceAll2x}
                  disabled={
                    isReplacing || isReplacing2x || completedCount === 0
                  }
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isReplacing2x ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Replacing with 2x...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Replace All with 2x ({completedCount})
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
