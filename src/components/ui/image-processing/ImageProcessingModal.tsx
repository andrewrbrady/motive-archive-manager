import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  ProcessableImageData,
  ProcessingType,
  ImageDimensions,
  ProcessedImageData,
  ImageProcessingModalProps,
} from "./types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Download,
  Eye,
  Upload,
  CheckCircle,
  XCircle,
  ExternalLink,
  Car,
  Check,
  X,
  Crop,
  Expand,
  Palette,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useImageProcessing } from "@/lib/hooks/useImageProcessing";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { getMediumVariantUrl } from "@/lib/imageUtils";
import { CropControls } from "./CropControls";
import { CanvasExtensionControls } from "./CanvasExtensionControls";
import { MatteControls } from "./MatteControls";
import { ImageProcessingModalHeader } from "@/components/cars/shared/ImageProcessingModalHeader";
import { ImageProcessingModalFooter } from "@/components/cars/shared/ImageProcessingModalFooter";

// All types are now imported from ./types

export function ImageProcessingModal({
  isOpen,
  onClose,
  image,
  processingType,
  enablePreview = false,
  galleryId,
  onImageReplaced,
}: ImageProcessingModalProps) {
  const processing = useImageProcessing({
    image,
    processingType,
    enablePreview,
    galleryId,
    onImageReplaced,
  });

  // Live preview settings - enabled by default
  const [livePreviewEnabled, setLivePreviewEnabled] = useState<boolean>(true);
  const [isGeneratingPreview, setIsGeneratingPreview] =
    useState<boolean>(false);
  const [livePreviewUrl, setLivePreviewUrl] = useState<string | null>(null);
  const [previewProcessingTime, setPreviewProcessingTime] = useState<
    number | null
  >(null);

  // Canvas refs for interactive preview
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [canvasScale, setCanvasScale] = useState(1);

  // Debounce timer for live preview
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load live preview preference from localStorage
  useEffect(() => {
    const savedLivePreview = localStorage.getItem("imageProcessingLivePreview");
    if (savedLivePreview !== null) {
      setLivePreviewEnabled(savedLivePreview === "true");
    }
  }, []);

  // Handle live preview toggle
  const handleLivePreviewToggle = (enabled: boolean) => {
    setLivePreviewEnabled(enabled);
    localStorage.setItem("imageProcessingLivePreview", enabled.toString());

    if (!enabled) {
      setLivePreviewUrl(null);
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    } else {
      generateLivePreview();
    }
  };

  // Generate live preview that shows the actual crop result or canvas extension
  const generateLivePreview = useCallback(async () => {
    if (!livePreviewEnabled || !image?.url || !processing.originalDimensions) {
      setLivePreviewUrl(null);
      return;
    }

    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }

    previewTimeoutRef.current = setTimeout(
      async () => {
        const startTime = Date.now();

        if (
          processingType === "image-crop" &&
          processing.parameters?.cropArea
        ) {
          // Generate client-side crop preview
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          const img = new window.Image();

          img.onload = () => {
            const { cropArea } = processing.parameters;
            const outputWidth =
              parseInt(processing.parameters.outputWidth) || 1080;
            const outputHeight =
              parseInt(processing.parameters.outputHeight) || 1920;

            if (cropArea && cropArea.width > 0 && cropArea.height > 0) {
              // Set canvas to output dimensions
              canvas.width = outputWidth;
              canvas.height = outputHeight;

              // Calculate scaling to fit the crop into output dimensions
              const scaleX = outputWidth / cropArea.width;
              const scaleY = outputHeight / cropArea.height;
              const scale = Math.min(scaleX, scaleY);

              // Calculate centered position
              const scaledWidth = cropArea.width * scale;
              const scaledHeight = cropArea.height * scale;
              const offsetX = (outputWidth - scaledWidth) / 2;
              const offsetY = (outputHeight - scaledHeight) / 2;

              // Clear canvas
              ctx.fillStyle = "#ffffff";
              ctx.fillRect(0, 0, outputWidth, outputHeight);

              // Draw the cropped portion
              ctx.drawImage(
                img,
                cropArea.x,
                cropArea.y,
                cropArea.width,
                cropArea.height, // Source
                offsetX,
                offsetY,
                scaledWidth,
                scaledHeight // Destination
              );

              // Convert to data URL and set as preview
              const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
              setLivePreviewUrl(dataUrl);
            } else {
              // No valid crop area, show normalized original
              setLivePreviewUrl(getMediumVariantUrl(image.url));
            }

            setPreviewProcessingTime(Date.now() - startTime);
          };

          img.crossOrigin = "anonymous";
          img.src = getMediumVariantUrl(image.url);
        } else if (
          processingType === "canvas-extension" &&
          processing.parameters?.desiredHeight &&
          processing.parameters?.outputWidth
        ) {
          // Generate API-based canvas extension preview
          try {
            setIsGeneratingPreview(true);

            // Use the exact same payload structure as the working 2x gallery save
            const baseDesiredHeight =
              parseInt(processing.parameters.desiredHeight) || 1350;
            const baseRequestedWidth =
              parseInt(processing.parameters.outputWidth) || 1080;

            // Use 2x scale like the working gallery save, but don't upload
            const scale = 2;

            const payload = {
              imageUrl: image.url,
              desiredHeight: Math.round(baseDesiredHeight * scale),
              paddingPct:
                parseFloat(processing.parameters.paddingPercentage) || 0.05,
              whiteThresh: parseInt(processing.parameters.whiteThreshold) || 90,
              uploadToCloudflare: false,
              requestedWidth: Math.round(baseRequestedWidth * scale),
              requestedHeight: Math.round(baseDesiredHeight * scale),
              scaleMultiplier: scale,
              previewImageDimensions: processing.originalDimensions,
            };

            console.log("🔍 Canvas extension preview payload:", {
              originalDimensions: processing.originalDimensions,
              previewPayload: payload,
              parameters: processing.parameters,
            });

            const response = await fetch("/api/images/extend-canvas", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            });

            if (response.ok) {
              const result = await response.json();
              if (result.processedImageUrl) {
                // Log the data URL format for debugging
                console.log("🔍 Canvas extension preview result:", {
                  hasProcessedImageUrl: !!result.processedImageUrl,
                  isDataUrl: result.processedImageUrl.startsWith("data:"),
                  urlStart: result.processedImageUrl.substring(0, 50),
                  urlLength: result.processedImageUrl.length,
                });

                // Ensure the data URL is properly formatted
                let processedUrl = result.processedImageUrl;
                if (
                  processedUrl.startsWith("data:image") &&
                  !processedUrl.includes("base64,")
                ) {
                  // If it's a data URL but missing base64 indicator, add it
                  processedUrl = processedUrl.replace(
                    "data:image/jpeg;",
                    "data:image/jpeg;base64,"
                  );
                  processedUrl = processedUrl.replace(
                    "data:image/png;",
                    "data:image/png;base64,"
                  );
                }

                setLivePreviewUrl(processedUrl);
                setPreviewProcessingTime(Date.now() - startTime);
              } else {
                // Fallback to normalized original image
                setLivePreviewUrl(getMediumVariantUrl(image.url));
              }
            } else {
              // Fallback to normalized original image on error
              setLivePreviewUrl(getMediumVariantUrl(image.url));
            }
          } catch (error) {
            console.error("Canvas extension preview error:", error);
            // Fallback to normalized original image
            setLivePreviewUrl(getMediumVariantUrl(image.url));
          } finally {
            setIsGeneratingPreview(false);
          }
        } else if (
          processingType === "image-matte" &&
          processing.parameters?.canvasWidth &&
          processing.parameters?.canvasHeight
        ) {
          // Generate API-based matte preview
          try {
            setIsGeneratingPreview(true);

            const payload = {
              imageUrl: image.url,
              canvasWidth: parseInt(processing.parameters.canvasWidth) || 1827,
              canvasHeight:
                parseInt(processing.parameters.canvasHeight) || 1080,
              paddingPercent:
                parseFloat(processing.parameters.paddingPercentage) || 0,
              matteColor: processing.parameters.matteColor || "#000000",
              uploadToCloudflare: false,
              requestedWidth:
                parseInt(processing.parameters.outputWidth) || 1080,
              requestedHeight:
                parseInt(processing.parameters.canvasHeight) || 1080,
            };

            console.log("🔍 Matte preview payload:", {
              originalDimensions: processing.originalDimensions,
              previewPayload: payload,
              parameters: processing.parameters,
            });

            const response = await fetch("/api/images/create-matte", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            });

            if (response.ok) {
              const result = await response.json();
              if (result.processedImageUrl) {
                console.log("🔍 Matte preview result:", {
                  hasProcessedImageUrl: !!result.processedImageUrl,
                  isDataUrl: result.processedImageUrl.startsWith("data:"),
                  urlStart: result.processedImageUrl.substring(0, 50),
                  urlLength: result.processedImageUrl.length,
                });

                // Ensure the data URL is properly formatted
                let processedUrl = result.processedImageUrl;
                if (
                  processedUrl.startsWith("data:image") &&
                  !processedUrl.includes("base64,")
                ) {
                  processedUrl = processedUrl.replace(
                    "data:image/jpeg;",
                    "data:image/jpeg;base64,"
                  );
                  processedUrl = processedUrl.replace(
                    "data:image/png;",
                    "data:image/png;base64,"
                  );
                }

                setLivePreviewUrl(processedUrl);
                setPreviewProcessingTime(Date.now() - startTime);
              } else {
                setLivePreviewUrl(getMediumVariantUrl(image.url));
              }
            } else {
              setLivePreviewUrl(getMediumVariantUrl(image.url));
            }
          } catch (error) {
            console.error("Matte preview error:", error);
            setLivePreviewUrl(getMediumVariantUrl(image.url));
          } finally {
            setIsGeneratingPreview(false);
          }
        } else {
          // For other processing types or missing parameters, show normalized original image
          setLivePreviewUrl(getMediumVariantUrl(image.url));
          setPreviewProcessingTime(Date.now() - startTime);
        }
      },
      processingType === "canvas-extension" ? 500 : 100
    ); // Longer debounce for API calls
  }, [
    livePreviewEnabled,
    image?.url,
    processing.originalDimensions,
    processing.parameters,
    processingType,
  ]);

  // Generate live preview when settings change or component loads
  useEffect(() => {
    generateLivePreview();
  }, [generateLivePreview]);

  // Initialize live preview when image loads
  useEffect(() => {
    if (image?.url && livePreviewEnabled) {
      generateLivePreview();
    }
  }, [image?.url, livePreviewEnabled, generateLivePreview]);

  // Draw canvas with overlay based on processing type
  useEffect(() => {
    if (!canvasRef.current || !image?.url || !processing.originalDimensions)
      return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new window.Image();
    img.onload = () => {
      // Calculate canvas dimensions to fit the container
      const maxWidth = 500;
      const maxHeight = 400;
      const aspectRatio =
        processing.originalDimensions!.width /
        processing.originalDimensions!.height;

      let canvasWidth = maxWidth;
      let canvasHeight = maxWidth / aspectRatio;

      if (canvasHeight > maxHeight) {
        canvasHeight = maxHeight;
        canvasWidth = maxHeight * aspectRatio;
      }

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      const scale = canvasWidth / processing.originalDimensions!.width;
      setCanvasScale(scale);

      // Draw the image
      ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);

      // Draw overlay based on processing type
      if (processingType === "image-crop" && processing.parameters.cropArea) {
        const { cropArea } = processing.parameters;
        if (cropArea.width > 0 && cropArea.height > 0) {
          // Darken areas outside crop
          ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
          ctx.fillRect(0, 0, canvasWidth, canvasHeight);

          // Clear the crop area
          ctx.globalCompositeOperation = "destination-out";
          ctx.fillRect(
            cropArea.x * scale,
            cropArea.y * scale,
            cropArea.width * scale,
            cropArea.height * scale
          );

          // Draw crop border
          ctx.globalCompositeOperation = "source-over";
          ctx.strokeStyle = "#22c55e";
          ctx.lineWidth = 2;
          ctx.strokeRect(
            cropArea.x * scale,
            cropArea.y * scale,
            cropArea.width * scale,
            cropArea.height * scale
          );
        }
      } else if (processingType === "canvas-extension") {
        // Draw extension indicators
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, canvasWidth, canvasHeight);

        // Add some visual indicator of where the extension would happen
        ctx.fillStyle = "rgba(59, 130, 246, 0.1)";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      } else if (processingType === "image-matte") {
        // Draw matte preview
        const matteColor = processing.parameters.matteColor || "#000000";
        ctx.strokeStyle = matteColor;
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, canvasWidth - 4, canvasHeight - 4);
      }
    };
    // Use CORS-safe, variant-normalized URL for canvas drawing
    img.crossOrigin = "anonymous";
    img.src = getMediumVariantUrl(image.url);
  }, [
    image?.url,
    processing.originalDimensions,
    processing.parameters,
    processingType,
    canvasScale,
  ]);

  // Mouse handlers for crop interaction (only for crop tool)
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (processingType !== "image-crop" || !processing.originalDimensions)
      return;

    setIsDragging(true);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setDragStart({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (
      !isDragging ||
      processingType !== "image-crop" ||
      !processing.originalDimensions
    )
      return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    const deltaX = (currentX - dragStart.x) / canvasScale;
    const deltaY = (currentY - dragStart.y) / canvasScale;

    if (processing.parameters.cropArea) {
      const newX = Math.max(
        0,
        Math.min(
          processing.parameters.cropArea.x + deltaX,
          processing.originalDimensions.width -
            processing.parameters.cropArea.width
        )
      );
      const newY = Math.max(
        0,
        Math.min(
          processing.parameters.cropArea.y + deltaY,
          processing.originalDimensions.height -
            processing.parameters.cropArea.height
        )
      );

      processing.setParameters({
        ...processing.parameters,
        cropArea: {
          ...processing.parameters.cropArea,
          x: Math.round(newX),
          y: Math.round(newY),
        },
      });
    }

    setDragStart({ x: currentX, y: currentY });
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  // Get icon and title based on processing type
  const getModalConfig = () => {
    switch (processingType) {
      case "image-crop":
        return {
          icon: <Crop className="h-5 w-5" />,
          title: "Image Crop Tool",
          description:
            "Crop and scale your image for social media formats. Drag the crop area on the preview to adjust.",
          previewTitle: "Image Preview & Crop Area",
          previewHint: "Drag to move the crop area",
        };
      case "canvas-extension":
        return {
          icon: <Expand className="h-5 w-5" />,
          title: "Canvas Extension Tool",
          description:
            "Extend your image canvas and position content. Choose dimensions and adjust positioning.",
          previewTitle: "Image Preview & Extension Area",
          previewHint: "Preview shows extension boundaries",
        };
      case "image-matte":
        return {
          icon: <Palette className="h-5 w-5" />,
          title: "Image Matte Tool",
          description:
            "Add a matte/border around your image. Choose colors and adjust thickness.",
          previewTitle: "Image Preview & Matte",
          previewHint: "Preview shows matte border",
        };
      default:
        return {
          icon: <Crop className="h-5 w-5" />,
          title: "Image Processing",
          description: "Process your image",
          previewTitle: "Image Preview",
          previewHint: "Preview area",
        };
    }
  };

  const config = getModalConfig();

  const handleClose = () => {
    processing.handleReset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-7xl max-h-[99vh] mx-2 overflow-hidden flex flex-col">
        <ImageProcessingModalHeader
          icon={config.icon}
          title={config.title}
          description={config.description}
          image={image}
          processingStatus={processing.processingStatus}
          error={processing.error}
          cloudflareResult={processing.cloudflareResult}
        />

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4 p-1">
            {/* Unified Preview Section - Top Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left: Image Preview with Processing Overlay */}
              <div className="space-y-2">
                <Label>{config.previewTitle}</Label>
                <div className="border rounded-lg bg-muted/50 relative h-[32rem] lg:h-[36rem] flex flex-col">
                  {image?.url ? (
                    <>
                      <div className="flex-1 p-4 flex items-center justify-center min-h-0">
                        <canvas
                          ref={canvasRef}
                          className={`border rounded max-w-full max-h-full ${
                            processingType === "image-crop"
                              ? "cursor-move"
                              : "cursor-default"
                          }`}
                          onMouseDown={handleCanvasMouseDown}
                          onMouseMove={handleCanvasMouseMove}
                          onMouseUp={handleCanvasMouseUp}
                          onMouseLeave={handleCanvasMouseUp}
                        />
                      </div>
                      <div className="px-4 pb-4">
                        <p className="text-xs text-muted-foreground">
                          {config.previewHint}. Original:{" "}
                          {processing.originalDimensions?.width}×
                          {processing.originalDimensions?.height}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                      No image selected
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Live Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Preview Mode</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleLivePreviewToggle(!livePreviewEnabled)}
                    className="h-8 px-3"
                  >
                    {livePreviewEnabled ? (
                      <>
                        <Eye className="mr-1 h-3 w-3" />
                        Preview On
                      </>
                    ) : (
                      <>
                        <Eye className="mr-1 h-3 w-3 opacity-50" />
                        Preview Off
                      </>
                    )}
                  </Button>
                </div>

                <div className="border rounded-lg p-4 bg-muted/50 relative">
                  {livePreviewEnabled &&
                  (processing.processedImageUrl || livePreviewUrl) ? (
                    <div className="space-y-2">
                      <div className="relative w-full flex justify-center">
                        <img
                          src={processing.processedImageUrl || livePreviewUrl!}
                          alt="Live preview"
                          className="max-w-full max-h-[32rem] lg:max-h-[36rem] object-contain rounded border"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {processing.processedImageUrl
                            ? "Processed Result"
                            : "Live Preview"}
                        </p>
                        {previewProcessingTime && (
                          <p className="text-xs text-muted-foreground">
                            {previewProcessingTime}ms
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="h-[32rem] lg:h-[36rem] flex items-center justify-center text-muted-foreground">
                      <div className="text-center space-y-2">
                        <Eye className="h-8 w-8 mx-auto opacity-50" />
                        <p className="text-sm">
                          {livePreviewEnabled
                            ? "Preview ready - adjust settings to see preview"
                            : "Preview mode disabled"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {livePreviewEnabled
                            ? "Original image with visual overlays"
                            : "Enable preview to see visual guides"}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Generating indicator */}
                  {isGeneratingPreview && (
                    <div className="absolute bottom-2 right-2">
                      <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Settings Section - Bottom */}
            <div className="border-t pt-4">
              {processingType === "image-crop" && (
                <CropControls processing={processing} image={image} />
              )}
              {processingType === "canvas-extension" && (
                <CanvasExtensionControls
                  processing={processing}
                  image={image}
                />
              )}
              {processingType === "image-matte" && (
                <MatteControls processing={processing} image={image} />
              )}
            </div>
          </div>
        </div>

        <ImageProcessingModalFooter
          enablePreview={enablePreview}
          galleryId={galleryId}
          showPreview={processing.showPreview}
          processedImage={processing.processedImage}
          isGalleryProcessing={processing.isGalleryProcessing}
          isReplacing={processing.isReplacing}
          isProcessing={processing.isProcessing}
          isProcessingHighRes={processing.isProcessingHighRes}
          highResMultiplier={processing.highResMultiplier}
          isUploading={processing.isUploading}
          processedImageUrl={processing.processedImageUrl}
          highResImageUrl={processing.highResImageUrl}
          cloudflareResult={processing.cloudflareResult}
          onReplaceImage={processing.handleReplaceImage}
          onSaveToImages={processing.handleSaveToImages}
          onDownloadLocal={processing.handleDownloadLocal}
          onReset={processing.handleReset}
          onClose={handleClose}
          canProcess={processing.canProcess}
          processButtonContent={{
            idle: {
              icon: config.icon,
              text:
                processingType === "image-crop"
                  ? "Crop Image"
                  : processingType === "canvas-extension"
                    ? "Extend Canvas"
                    : "Add Matte",
            },
            processing: { text: "Processing..." },
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
