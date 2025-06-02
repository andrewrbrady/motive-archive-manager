import React, { useState, useEffect, useMemo } from "react";
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
import {
  Loader2,
  Check,
  X,
  Download,
  Eye,
  ZoomIn,
  RotateCcw,
  Palette,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import Image from "next/image";
import { useGalleryImageProcessing } from "@/lib/hooks/useGalleryImageProcessing";
import { useAPI } from "@/hooks/useAPI";
import { toast as hotToast } from "react-hot-toast";

interface GalleryImageMatteModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: ImageData | null;
  galleryId: string;
  onImageReplaced?: (originalImageId: string, newImageData: any) => void;
}

interface ProcessedImageData {
  _id: string;
  url: string;
  filename: string;
  metadata: any;
  carId: string;
}

interface ImageDimensions {
  width: number;
  height: number;
}

interface CreateMatteData {
  imageUrl: string;
  canvasWidth: number;
  canvasHeight: number;
  paddingPercent: number;
  matteColor: string;
  uploadToCloudflare: boolean;
  originalFilename: string;
  requestedWidth: number;
  requestedHeight: number;
  scaleMultiplier: number;
}

interface CreateMatteResponse {
  success?: boolean;
  processedImageUrl?: string;
  error?: string;
}

export function GalleryImageMatteModal({
  isOpen,
  onClose,
  image,
  galleryId,
  onImageReplaced,
}: GalleryImageMatteModalProps) {
  const api = useAPI();
  const [canvasWidth, setCanvasWidth] = useState<string>("1920");
  const [canvasHeight, setCanvasHeight] = useState<string>("1080");
  const [paddingPercent, setPaddingPercent] = useState<string>("0");
  const [matteColor, setMatteColor] = useState<string>("#000000");
  const [cloudflareWidth, setCloudflareWidth] = useState<string>("2000");
  const [cloudflareQuality, setCloudflareQuality] = useState<string>("100");
  const [originalDimensions, setOriginalDimensions] =
    useState<ImageDimensions | null>(null);
  const [processedImage, setProcessedImage] =
    useState<ProcessedImageData | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const {
    previewProcessImage,
    replaceImageInGallery,
    isProcessing,
    isReplacing,
  } = useGalleryImageProcessing();

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

  // Helper function to get original processing URL (without enhancements)
  const getProcessingImageUrl = (baseUrl: string) => {
    if (baseUrl.includes("imagedelivery.net")) {
      // For Cloudflare URLs, use the base URL without any suffix
      const urlParts = baseUrl.split("/");
      // Remove any existing variant (like w=2000,q=100 or public)
      if (
        urlParts[urlParts.length - 1].includes("=") ||
        urlParts[urlParts.length - 1] === "public"
      ) {
        urlParts.pop();
      }
      return urlParts.join("/");
    }
    // For other URLs, try to remove any suffix
    return baseUrl.replace(/\/[^\/]*$/, "");
  };

  // Memoize the enhanced image URL
  const enhancedImageUrl = useMemo(() => {
    if (!image?.url) return null;
    return getEnhancedImageUrl(image.url, cloudflareWidth, cloudflareQuality);
  }, [image?.url, cloudflareWidth, cloudflareQuality]);

  // Load original image dimensions
  useEffect(() => {
    if (enhancedImageUrl) {
      const img = new window.Image();
      img.onload = () => {
        setOriginalDimensions({
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };
      img.src = enhancedImageUrl;
    }
  }, [enhancedImageUrl]);

  const handleProcess = async () => {
    if (!image || !enhancedImageUrl) return;

    // Use original processing URL for API calls, not enhanced URL
    const processingImageUrl = getProcessingImageUrl(image.url);

    // Test if the processing URL is accessible
    try {
      console.log(
        "🔍 Testing processing URL accessibility:",
        processingImageUrl
      );
      const testResponse = await fetch(processingImageUrl, {
        method: "HEAD",
        mode: "no-cors",
      });
      console.log("🔍 Processing URL test result:", {
        url: processingImageUrl,
        status: testResponse.status,
        statusText: testResponse.statusText,
        type: testResponse.type,
        note:
          testResponse.type === "opaque"
            ? "no-cors mode - limited response info available"
            : "normal response",
      });
    } catch (testError) {
      console.warn("⚠️ Processing URL test failed:", testError);
    }

    console.log("🎨 Image Matte processing starting:", {
      originalUrl: image.url,
      enhancedUrl: enhancedImageUrl.substring(0, 100) + "...",
      processingUrl: processingImageUrl,
      urlTransformation: {
        from: image.url,
        to: processingImageUrl,
        isCloudflare: image.url.includes("imagedelivery.net"),
      },
      parameters: {
        canvasWidth: parseInt(canvasWidth),
        canvasHeight: parseInt(canvasHeight),
        paddingPercent: parseFloat(paddingPercent),
        matteColor,
      },
    });

    const parameters = {
      imageUrl: processingImageUrl,
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

    if (result) {
      console.log("✅ Image Matte processing completed successfully");
      setProcessedImage(result.processedImage);
      setShowPreview(true);
    } else {
      console.error("❌ Image Matte processing failed - no result returned");
    }
  };

  const handleReplaceImage = async () => {
    if (!image || !processedImage) return;

    // Use original processing URL for API calls, not enhanced URL
    const processingImageUrl = getProcessingImageUrl(image.url);

    console.log("🔄 Image Matte replacement starting:", {
      originalUrl: image.url,
      processingUrl: processingImageUrl,
    });

    const parameters = {
      imageUrl: processingImageUrl,
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
      image._id,
      "image-matte",
      parameters
    );

    if (result && onImageReplaced) {
      console.log("✅ Image Matte replacement completed successfully");
      onImageReplaced(result.originalImageId, result.processedImage);
      handleClose();
    } else {
      console.error("❌ Image Matte replacement failed");
    }
  };

  const handleDiscardPreview = () => {
    setProcessedImage(null);
    setShowPreview(false);
  };

  const handleClose = () => {
    setCanvasWidth("1920");
    setCanvasHeight("1080");
    setPaddingPercent("0");
    setMatteColor("#000000");
    setCloudflareWidth("2000");
    setCloudflareQuality("100");
    setProcessedImage(null);
    setShowPreview(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Image Matte Generator</DialogTitle>
          <DialogDescription>
            Create a custom matte for this gallery image. Preview the result
            before deciding to replace the original.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left side - Controls */}
          <div className="space-y-4">
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
                  />
                </div>
              </div>
            </div>

            {/* Canvas Dimensions */}
            <div className="grid grid-cols-2 gap-2">
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
              >
                16:9 (1920×1080)
              </Button>
            </div>

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
              />
              <p className="text-xs text-muted-foreground mt-1">
                Percentage of canvas to use as padding around the image
              </p>
            </div>

            <div>
              <Label htmlFor="matteColor" className="flex items-center gap-2">
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
                />
                <Input
                  type="text"
                  value={matteColor}
                  onChange={(e) => setMatteColor(e.target.value)}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
              <div className="flex gap-1 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMatteColor("#000000")}
                  className="text-xs"
                >
                  Black
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMatteColor("#FFFFFF")}
                  className="text-xs"
                >
                  White
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMatteColor("#808080")}
                  className="text-xs"
                >
                  Gray
                </Button>
              </div>
            </div>

            <Button
              onClick={handleProcess}
              disabled={isProcessing || !image}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Matte...
                </>
              ) : (
                <>
                  <Palette className="mr-2 h-4 w-4" />
                  Create Matte & Preview
                </>
              )}
            </Button>

            {/* Preview Action Buttons */}
            {showPreview && processedImage && (
              <div className="flex gap-2">
                <Button
                  onClick={handleReplaceImage}
                  disabled={isReplacing}
                  className="flex-1"
                  variant="default"
                >
                  {isReplacing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Replacing...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Replace Original
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleDiscardPreview}
                  disabled={isReplacing}
                  variant="outline"
                  className="flex-1"
                >
                  <X className="mr-2 h-4 w-4" />
                  Discard
                </Button>
              </div>
            )}

            {/* Debug info */}
            {process.env.NODE_ENV === "development" && (
              <div className="text-xs text-muted-foreground mt-2">
                Debug: showPreview={showPreview.toString()}, hasProcessedImage=
                {!!processedImage}
                {processedImage && (
                  <div>Processed image URL: {processedImage.url}</div>
                )}
              </div>
            )}
          </div>

          {/* Middle - Original Image */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Original Image</Label>
                {originalDimensions && (
                  <span className="text-xs text-muted-foreground">
                    {originalDimensions.width} × {originalDimensions.height}
                  </span>
                )}
              </div>
              {enhancedImageUrl && (
                <div className="mt-2 border rounded-lg overflow-hidden bg-muted flex items-center justify-center min-h-[300px]">
                  <div className="relative max-w-full max-h-[400px]">
                    <Image
                      src={enhancedImageUrl}
                      alt={image?.filename || "Original image"}
                      width={0}
                      height={0}
                      sizes="100vw"
                      className="w-auto h-auto max-w-full max-h-[400px] object-contain"
                      style={{ width: "auto", height: "auto" }}
                      key={enhancedImageUrl}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right - Processed Image */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Processed Image</Label>
                {processedImage && (
                  <span className="text-xs text-muted-foreground">
                    Preview Ready
                  </span>
                )}
              </div>
              <div className="mt-2 border rounded-lg overflow-hidden bg-muted flex items-center justify-center min-h-[300px]">
                {processedImage ? (
                  <div className="relative max-w-full max-h-[400px]">
                    <Image
                      src={processedImage.url}
                      alt={processedImage.filename || "Processed image"}
                      width={0}
                      height={0}
                      sizes="100vw"
                      className="w-auto h-auto max-w-full max-h-[400px] object-contain"
                      style={{ width: "auto", height: "auto" }}
                      key={processedImage.url}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <div className="text-center">
                      <div className="h-8 w-8 mx-auto mb-2 opacity-50">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2-2h-3l-2.5-3z" />
                          <circle cx="12" cy="13" r="3" />
                        </svg>
                      </div>
                      <p className="text-sm">
                        Processed image will appear here
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
