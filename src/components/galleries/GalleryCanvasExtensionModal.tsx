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
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Settings,
  Cloud,
  Monitor,
  Check,
  X,
  Download,
  Eye,
  ZoomIn,
  RotateCcw,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import Image from "next/image";
import { useGalleryImageProcessing } from "@/lib/hooks/useGalleryImageProcessing";

interface GalleryCanvasExtensionModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: ImageData | null;
  galleryId: string;
  onImageReplaced?: (originalImageId: string, newImageData: any) => void;
}

type ProcessingMethod = "cloud" | "local";

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

export function GalleryCanvasExtensionModal({
  isOpen,
  onClose,
  image,
  galleryId,
  onImageReplaced,
}: GalleryCanvasExtensionModalProps) {
  const [desiredHeight, setDesiredHeight] = useState<string>("1200");
  const [paddingPct, setPaddingPct] = useState<string>("0.05");
  const [whiteThresh, setWhiteThresh] = useState<string>("90");
  const [cloudflareWidth, setCloudflareWidth] = useState<string>("2000");
  const [cloudflareQuality, setCloudflareQuality] = useState<string>("100");
  const [processingMethod, setProcessingMethod] =
    useState<ProcessingMethod>("cloud");
  const [originalDimensions, setOriginalDimensions] =
    useState<ImageDimensions | null>(null);
  const [processedImage, setProcessedImage] =
    useState<ProcessedImageData | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Add high-resolution state variables
  const [isProcessingHighRes, setIsProcessingHighRes] = useState(false);
  const [highResMultiplier, setHighResMultiplier] = useState<number | null>(
    null
  );
  const [highResImageUrl, setHighResImageUrl] = useState<string | null>(null);
  const [processedDimensions, setProcessedDimensions] =
    useState<ImageDimensions | null>(null);
  const [highResDimensions, setHighResDimensions] =
    useState<ImageDimensions | null>(null);

  const {
    previewProcessImage,
    replaceImageInGallery,
    isProcessing,
    isReplacing,
  } = useGalleryImageProcessing();

  // Load processing method preference from localStorage
  useEffect(() => {
    const savedMethod = localStorage.getItem(
      "canvasExtensionMethod"
    ) as ProcessingMethod;
    if (savedMethod && (savedMethod === "cloud" || savedMethod === "local")) {
      setProcessingMethod(savedMethod);
    }
  }, []);

  // Save processing method preference to localStorage
  const handleProcessingMethodChange = (method: ProcessingMethod) => {
    setProcessingMethod(method);
    localStorage.setItem("canvasExtensionMethod", method);
  };

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

  // Load processed image dimensions when processed image changes
  useEffect(() => {
    if (processedImage?.url) {
      const img = new window.Image();
      img.onload = () => {
        setProcessedDimensions({
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };
      img.src = processedImage.url;
    } else {
      setProcessedDimensions(null);
    }
  }, [processedImage?.url]);

  // Load high-res image dimensions when high-res image changes
  useEffect(() => {
    if (highResImageUrl) {
      const img = new window.Image();
      img.onload = () => {
        setHighResDimensions({
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };
      img.src = highResImageUrl;
    } else {
      setHighResDimensions(null);
    }
  }, [highResImageUrl]);

  const handlePreview = async () => {
    if (!image || !enhancedImageUrl) return;

    const parameters = {
      imageUrl: enhancedImageUrl,
      desiredHeight: parseInt(desiredHeight),
      paddingPct: parseFloat(paddingPct),
      whiteThresh: whiteThresh === "-1" ? -1 : parseInt(whiteThresh),
      processingMethod,
    };

    const result = await previewProcessImage({
      galleryId,
      imageId: image._id,
      processingType: "canvas-extension",
      parameters,
    });

    if (result) {
      setProcessedImage(result.processedImage);
      setShowPreview(true);
    }
  };

  const handleReplaceImage = async () => {
    if (!image || !processedImage) return;

    const parameters = {
      imageUrl: enhancedImageUrl,
      desiredHeight: parseInt(desiredHeight),
      paddingPct: parseFloat(paddingPct),
      whiteThresh: whiteThresh === "-1" ? -1 : parseInt(whiteThresh),
      processingMethod,
    };

    const result = await replaceImageInGallery(
      galleryId,
      image._id,
      "canvas-extension",
      parameters
    );

    if (result && onImageReplaced) {
      onImageReplaced(result.originalImageId, result.processedImage);
      handleClose();
    }
  };

  const handleHighResProcess = async (multiplier: 2 | 4) => {
    if (!image || !processedDimensions) return;

    setIsProcessingHighRes(true);
    setHighResMultiplier(multiplier);
    setHighResImageUrl(null);
    setHighResDimensions(null);

    try {
      // Calculate the high-resolution target dimensions
      // Scale BOTH width and height to maintain aspect ratio
      const targetWidth = processedDimensions.width * multiplier;
      const targetHeight = processedDimensions.height * multiplier;

      // Get the high-resolution source image from Cloudflare
      // Use the multiplied width to get a proportionally larger source image
      const highResCloudflareWidth = parseInt(cloudflareWidth) * multiplier;
      const highResSourceUrl = getEnhancedImageUrl(
        image.url,
        highResCloudflareWidth.toString(),
        cloudflareQuality
      );

      const response = await fetch("/api/images/extend-canvas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl: highResSourceUrl, // Use high-resolution source from Cloudflare
          desiredHeight: targetHeight,
          paddingPct: parseFloat(paddingPct),
          whiteThresh: whiteThresh === "-1" ? -1 : parseInt(whiteThresh),
          uploadToCloudflare: false,
          originalFilename: image.filename,
          requestedWidth: processedDimensions.width,
          requestedHeight: parseInt(desiredHeight),
          scaleMultiplier: multiplier,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to process high-resolution image");
      }

      const result = await response.json();
      setHighResImageUrl(result.processedImageUrl);

      toast({
        title: "Success",
        description: `${multiplier}x high-resolution image processed successfully (${targetWidth}×${targetHeight})`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to process ${multiplier}x high-resolution image`,
        variant: "destructive",
      });
    } finally {
      setIsProcessingHighRes(false);
    }
  };

  const handleHighResDownload = () => {
    if (highResImageUrl && highResMultiplier) {
      // Convert data URL to blob for better download handling
      fetch(highResImageUrl)
        .then((res) => res.blob())
        .then((blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `extended_${highResMultiplier}x_${image?.filename || "image"}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        })
        .catch((error) => {
          console.error("Blob creation failed:", error);
          // Fallback to direct download
          const link = document.createElement("a");
          link.href = highResImageUrl;
          link.download = `extended_${highResMultiplier}x_${image?.filename || "image"}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        });
    }
  };

  const handleDiscardPreview = () => {
    setProcessedImage(null);
    setShowPreview(false);
  };

  const handleClose = () => {
    setDesiredHeight("1200");
    setPaddingPct("0.05");
    setWhiteThresh("90");
    setCloudflareWidth("2000");
    setCloudflareQuality("100");
    setProcessedImage(null);
    setShowPreview(false);
    // Reset high-resolution state variables
    setIsProcessingHighRes(false);
    setHighResMultiplier(null);
    setHighResImageUrl(null);
    setProcessedDimensions(null);
    setHighResDimensions(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Canvas Extension</DialogTitle>
          <DialogDescription>
            Auto-extend the vertical canvas of this gallery image. Preview the
            result before deciding to replace the original.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Image Preview Section */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* Left: Original Image */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Original Image</Label>
                {originalDimensions && (
                  <span className="text-xs text-muted-foreground">
                    {originalDimensions.width} × {originalDimensions.height}
                  </span>
                )}
              </div>
              {enhancedImageUrl && (
                <div className="border rounded-lg overflow-hidden bg-muted flex items-center justify-center min-h-[200px] lg:min-h-[300px]">
                  <div className="relative max-w-full max-h-[300px] lg:max-h-[400px]">
                    <Image
                      src={enhancedImageUrl}
                      alt={image?.filename || "Original image"}
                      width={0}
                      height={0}
                      sizes="100vw"
                      className="w-auto h-auto max-w-full max-h-[300px] lg:max-h-[400px] object-contain"
                      style={{ width: "auto", height: "auto" }}
                      key={enhancedImageUrl}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Middle: Processed Image */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  {highResImageUrl
                    ? `High-Res Image (${highResMultiplier}x)`
                    : "Processed Image"}
                </Label>
                {(highResDimensions || processedDimensions) && (
                  <span className="text-xs text-muted-foreground">
                    {highResDimensions
                      ? `${highResDimensions.width} × ${highResDimensions.height}`
                      : processedDimensions
                        ? `${processedDimensions.width} × ${processedDimensions.height}`
                        : ""}
                  </span>
                )}
              </div>
              <div className="border rounded-lg overflow-hidden bg-muted flex items-center justify-center min-h-[200px] lg:min-h-[300px]">
                {highResImageUrl || processedImage ? (
                  <div className="relative max-w-full max-h-[300px] lg:max-h-[400px]">
                    <Image
                      src={(highResImageUrl || processedImage?.url)!}
                      alt={
                        highResImageUrl
                          ? "High-resolution processed image"
                          : processedImage?.filename || "Processed image"
                      }
                      width={0}
                      height={0}
                      sizes="100vw"
                      className="w-auto h-auto max-w-full max-h-[300px] lg:max-h-[400px] object-contain"
                      style={{ width: "auto", height: "auto" }}
                      key={highResImageUrl || processedImage?.url}
                    />
                    {highResImageUrl && (
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium">
                        {highResMultiplier}x High-Res
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[200px] lg:h-[300px] text-muted-foreground">
                    <div className="text-center">
                      <Eye className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">
                        Processed image will appear here
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Toggle between processed and high-res images */}
              {processedImage && highResImageUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setHighResImageUrl(null);
                    setHighResDimensions(null);
                  }}
                  className="w-full text-xs"
                >
                  Show Original Preview
                </Button>
              )}
            </div>

            {/* Right: Settings */}
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

              {/* Processing Method Settings */}
              <div className="p-3 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Settings className="h-4 w-4" />
                  <Label className="text-sm font-medium">
                    Processing Method
                  </Label>
                </div>
                <Select
                  value={processingMethod}
                  onValueChange={handleProcessingMethodChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select processing method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cloud">
                      <div className="flex items-center gap-2">
                        <Cloud className="h-4 w-4" />
                        <span>Cloud Run</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="local">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        <span>Local Binary</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
                />

                {/* Aspect Ratio Preset Buttons */}
                {originalDimensions && (
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
                    >
                      1:1 (1080×1080)
                    </Button>
                  </div>
                )}
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
                />
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
                        disabled={whiteThresh === "-1"}
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

              {/* Debug info */}
              {process.env.NODE_ENV === "development" && (
                <div className="text-xs text-muted-foreground mt-2">
                  Debug: showPreview={showPreview.toString()},
                  hasProcessedImage=
                  {!!processedImage}
                  {processedImage && (
                    <div>Processed image URL: {processedImage.url}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-wrap gap-2">
          <div className="flex gap-2 flex-wrap">
            {/* Preview Button */}
            <Button
              onClick={handlePreview}
              disabled={isProcessing || !image}
              className="bg-black hover:bg-gray-800 text-white"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </>
              )}
            </Button>

            {/* Replace/Discard Buttons */}
            {showPreview && processedImage && (
              <>
                <Button
                  onClick={handleReplaceImage}
                  disabled={isReplacing}
                  variant="outline"
                  className="border-gray-300 hover:bg-gray-50"
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
                  className="border-gray-300 hover:bg-gray-50"
                >
                  <X className="mr-2 h-4 w-4" />
                  Discard
                </Button>
              </>
            )}

            {/* High-Resolution Processing Buttons */}
            {showPreview && processedImage && (
              <>
                <Button
                  onClick={() => handleHighResProcess(2)}
                  disabled={isProcessingHighRes}
                  variant="outline"
                  className="border-gray-300 hover:bg-gray-50"
                >
                  {isProcessingHighRes && highResMultiplier === 2 ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      2x Processing...
                    </>
                  ) : (
                    <>
                      <ZoomIn className="mr-2 h-4 w-4" />
                      2x High-Res
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => handleHighResProcess(4)}
                  disabled={isProcessingHighRes}
                  variant="outline"
                  className="border-gray-300 hover:bg-gray-50"
                >
                  {isProcessingHighRes && highResMultiplier === 4 ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      4x Processing...
                    </>
                  ) : (
                    <>
                      <ZoomIn className="mr-2 h-4 w-4" />
                      4x High-Res
                    </>
                  )}
                </Button>
              </>
            )}

            {/* Download High-Res Button */}
            {highResImageUrl && (
              <Button
                onClick={handleHighResDownload}
                variant="outline"
                className="border-gray-300 hover:bg-gray-50"
              >
                <Download className="mr-2 h-4 w-4" />
                Download {highResMultiplier}x High-Res
              </Button>
            )}

            {/* Reset Button */}
            <Button variant="outline" onClick={handleClose}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>

          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
