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
  Download,
  Eye,
  Upload,
  CheckCircle,
  XCircle,
  ExternalLink,
  Car,
  Settings,
  Cloud,
  Monitor,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import Image from "next/image";
import { useAPI } from "@/hooks/useAPI";

interface CanvasExtensionModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: ImageData | null;
}

interface ImageDimensions {
  width: number;
  height: number;
}

interface CloudflareUploadResult {
  success: boolean;
  imageId?: string;
  imageUrl?: string;
  filename?: string;
  mongoId?: string;
  error?: string;
}

interface ExtendCanvasResponse {
  success: boolean;
  processedImageUrl: string;
  remoteServiceUsed?: boolean;
  remoteService?: boolean;
  error?: string;
  cloudflareUpload?: CloudflareUploadResult;
}

type ProcessingMethod = "cloud" | "local";

export function CanvasExtensionModal({
  isOpen,
  onClose,
  image,
}: CanvasExtensionModalProps) {
  // Early return if modal is not open - must be before ALL hooks
  if (!isOpen) {
    return null;
  }

  // All hooks must come after the early return check and BEFORE any other conditional returns
  const api = useAPI();
  const [desiredHeight, setDesiredHeight] = useState<string>("1200");
  const [paddingPct, setPaddingPct] = useState<string>("0.05");
  const [whiteThresh, setWhiteThresh] = useState<string>("90");
  const [cloudflareWidth, setCloudflareWidth] = useState<string>("2000");
  const [cloudflareQuality, setCloudflareQuality] = useState<string>("100");
  const [processingMethod, setProcessingMethod] =
    useState<ProcessingMethod>("cloud");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessingHighRes, setIsProcessingHighRes] = useState(false);
  const [highResMultiplier, setHighResMultiplier] = useState<number | null>(
    null
  );
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(
    null
  );
  const [highResImageUrl, setHighResImageUrl] = useState<string | null>(null);
  const [originalDimensions, setOriginalDimensions] =
    useState<ImageDimensions | null>(null);
  const [processedDimensions, setProcessedDimensions] =
    useState<ImageDimensions | null>(null);
  const [highResDimensions, setHighResDimensions] =
    useState<ImageDimensions | null>(null);
  const [cloudflareResult, setCloudflareResult] =
    useState<CloudflareUploadResult | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [remoteServiceUsed, setRemoteServiceUsed] = useState<boolean>(false);
  const [imageLoadError, setImageLoadError] = useState<boolean>(false);
  const [processedImageLoadError, setProcessedImageLoadError] =
    useState<boolean>(false);
  const [useTestImage, setUseTestImage] = useState(false);

  // Load processing method preference from localStorage
  useEffect(() => {
    const savedMethod = localStorage.getItem(
      "canvasExtensionMethod"
    ) as ProcessingMethod;
    if (savedMethod && (savedMethod === "cloud" || savedMethod === "local")) {
      setProcessingMethod(savedMethod);
    }
  }, []);

  // Helper function to build enhanced Cloudflare URL
  const getEnhancedImageUrl = (
    baseUrl: string,
    width?: string,
    quality?: string
  ) => {
    let params = [];
    // Always check for truthy values and non-empty strings
    if (width && width.trim() !== "") params.push(`w=${width}`);
    if (quality && quality.trim() !== "") params.push(`q=${quality}`);

    if (params.length === 0) return baseUrl;

    // Handle different Cloudflare URL formats
    // Format: https://imagedelivery.net/account/image-id/public
    // Should become: https://imagedelivery.net/account/image-id/w=1080,q=100
    if (baseUrl.includes("imagedelivery.net")) {
      // Check if URL already has transformations (contains variant like 'public')
      if (baseUrl.endsWith("/public") || baseUrl.match(/\/[a-zA-Z]+$/)) {
        // Replace the last segment (usually 'public') with our parameters
        const urlParts = baseUrl.split("/");
        urlParts[urlParts.length - 1] = params.join(",");
        return urlParts.join("/");
      } else {
        // URL doesn't have a variant, append transformations
        return `${baseUrl}/${params.join(",")}`;
      }
    }

    // Fallback for other URL formats - try to replace /public if it exists
    return baseUrl.replace(/\/public$/, `/${params.join(",")}`);
  };

  // Memoize the enhanced image URL to prevent useEffect dependency array changes
  const enhancedImageUrl = useMemo(() => {
    if (!image?.url) return null;
    const enhanced = getEnhancedImageUrl(
      image.url,
      cloudflareWidth,
      cloudflareQuality
    );
    console.log("URL transformation:", {
      original: image.url,
      enhanced: enhanced,
      width: cloudflareWidth,
      quality: cloudflareQuality,
    });
    return enhanced;
  }, [image?.url, cloudflareWidth, cloudflareQuality]);

  // Add debugging for the current image URL
  useEffect(() => {
    if (enhancedImageUrl) {
      console.log("Current image URL for display:", {
        currentImageUrl: enhancedImageUrl,
        isCloudflare: enhancedImageUrl.includes("imagedelivery.net"),
        hasTransforms: enhancedImageUrl.includes(","),
      });
    }
  }, [enhancedImageUrl]);

  // PHASE 1 DEBUGGING: Complete image data structure investigation
  useEffect(() => {
    console.log("=== CANVAS EXTENSION MODAL - PHASE 1 DEBUG START ===");
    console.log("Image prop object (complete):", image);
    console.log("Image data structure breakdown:", {
      hasImage: !!image,
      imageId: image?._id,
      cloudflareId: image?.cloudflareId,
      originalUrl: image?.url,
      filename: image?.filename,
      width: image?.width,
      height: image?.height,
      carId: image?.carId,
      metadata: image?.metadata,
      createdAt: image?.createdAt,
      updatedAt: image?.updatedAt,
    });

    // Test URL accessibility
    if (image?.url) {
      console.log("Testing original URL accessibility:", image.url);
      fetch(image.url, { method: "HEAD", mode: "no-cors" })
        .then((response) => {
          console.log("Original URL fetch test result:", {
            url: image.url,
            status: response.status,
            statusText: response.statusText,
            type: response.type,
            note: "no-cors mode - limited response info available",
          });
        })
        .catch((error) => {
          console.log("Original URL fetch test (expected CORS limitation):", {
            url: image.url,
            error: error.message,
            note: "CORS errors are normal for cross-origin image requests",
          });
        });
    }

    // Enhanced URL transformation debugging
    if (image?.url) {
      const originalUrl = image.url;
      const enhanced = getEnhancedImageUrl(
        originalUrl,
        cloudflareWidth,
        cloudflareQuality
      );

      console.log("URL transformation chain:", {
        step1_original: originalUrl,
        step2_enhanced: enhanced,
        step3_params: {
          width: cloudflareWidth,
          quality: cloudflareQuality,
        },
        step4_validation: {
          originalIsString: typeof originalUrl === "string",
          enhancedIsString: typeof enhanced === "string",
          originalLength: originalUrl?.length,
          enhancedLength: enhanced?.length,
          containsImageDelivery: enhanced?.includes("imagedelivery.net"),
          hasTransformations: enhanced?.includes(","),
          preservesImageId: enhanced?.includes(
            originalUrl.split("/").slice(-1)[0]?.split("?")[0]
          ),
        },
      });

      // Test enhanced URL accessibility
      console.log("Testing enhanced URL accessibility:", enhanced);
      fetch(enhanced, { method: "HEAD", mode: "no-cors" })
        .then((response) => {
          console.log("Enhanced URL fetch test result:", {
            url: enhanced,
            status: response.status,
            statusText: response.statusText,
            type: response.type,
            note: "no-cors mode - limited response info available",
          });
        })
        .catch((error) => {
          console.log("Enhanced URL fetch test (expected CORS limitation):", {
            url: enhanced,
            error: error.message,
            note: "CORS errors are normal for cross-origin image requests",
          });
        });
    }

    console.log("=== CANVAS EXTENSION MODAL - PHASE 1 DEBUG END ===");
  }, [image, cloudflareWidth, cloudflareQuality]);

  // PHASE 1 TESTING: Hardcoded test image URL
  const testImageUrl =
    "https://placehold.co/800x600/000000/FFFFFF?text=Test+Canvas+Extension";

  // Reset error states when image changes
  useEffect(() => {
    setImageLoadError(false);
    setProcessedImageLoadError(false);
  }, [image?.url]);

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
    if (processedImageUrl) {
      const img = new window.Image();
      img.onload = () => {
        setProcessedDimensions({
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };
      img.src = processedImageUrl;
    } else {
      setProcessedDimensions(null);
    }
  }, [processedImageUrl]);

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

  // Authentication check after ALL hooks are declared
  if (!api) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Loading...</DialogTitle>
            <DialogDescription>Authenticating...</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  // Save processing method preference to localStorage
  const handleProcessingMethodChange = (method: ProcessingMethod) => {
    setProcessingMethod(method);
    localStorage.setItem("canvasExtensionMethod", method);
  };

  // Get the current enhanced image URL for display
  const currentImageUrl = useTestImage ? testImageUrl : enhancedImageUrl;

  const handleProcess = async () => {
    if (!image || !enhancedImageUrl || !api) return;

    setIsProcessing(true);
    setCloudflareResult(null);
    setRemoteServiceUsed(false);

    try {
      const result = (await api.post("images/extend-canvas", {
        imageUrl: enhancedImageUrl,
        desiredHeight: parseInt(desiredHeight),
        paddingPct: parseFloat(paddingPct),
        whiteThresh: whiteThresh === "-1" ? -1 : parseInt(whiteThresh),
        processingMethod: processingMethod,
        uploadToCloudflare: false,
        originalFilename: image.filename,
      })) as ExtendCanvasResponse;

      if (result.success) {
        setProcessedImageUrl(result.processedImageUrl);
        setProcessingStatus("completed");

        // Track which service was used
        if (result.remoteServiceUsed || result.remoteService) {
          setRemoteServiceUsed(true);
        }

        toast({
          title: "Success",
          description: `Image processed successfully using ${
            result.remoteServiceUsed || result.remoteService
              ? "Cloud Run service"
              : "local binary"
          }`,
        });
      } else {
        setProcessingStatus("error");
        setError(result.error || "Processing failed");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process image",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleHighResProcess = async (multiplier: 2 | 4) => {
    if (!image || !processedDimensions || !api) return;

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

      const result = (await api.post("images/extend-canvas", {
        imageUrl: highResSourceUrl, // Use high-resolution source from Cloudflare
        desiredHeight: targetHeight,
        paddingPct: parseFloat(paddingPct),
        whiteThresh: whiteThresh === "-1" ? -1 : parseInt(whiteThresh),
        uploadToCloudflare: false,
        originalFilename: image.filename,
      })) as ExtendCanvasResponse;

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

  const handleUploadToCloudflare = async () => {
    if (!image || !processedImageUrl || !enhancedImageUrl || !api) return;

    setIsUploading(true);
    setCloudflareResult(null);

    try {
      // If we have a high-res image, use high-res parameters for upload
      let uploadHeight = parseInt(desiredHeight);
      let uploadSourceUrl = enhancedImageUrl;
      let uploadFilename = image.filename;

      if (highResImageUrl && highResMultiplier && processedDimensions) {
        // Use high-resolution parameters
        uploadHeight = processedDimensions.height * highResMultiplier;
        const highResCloudflareWidth =
          parseInt(cloudflareWidth) * highResMultiplier;
        uploadSourceUrl = getEnhancedImageUrl(
          image.url,
          highResCloudflareWidth.toString(),
          cloudflareQuality
        );

        // Update filename to indicate high-res
        const baseFilename = image.filename || "image";
        const nameWithoutExt = baseFilename.replace(/\.[^/.]+$/, "");
        const ext = baseFilename.includes(".")
          ? baseFilename.split(".").pop()
          : "jpg";
        uploadFilename = `${nameWithoutExt}_${highResMultiplier}x.${ext}`;
      }

      const result = (await api.post("images/extend-canvas", {
        imageUrl: uploadSourceUrl,
        desiredHeight: uploadHeight,
        paddingPct: parseFloat(paddingPct),
        whiteThresh: whiteThresh === "-1" ? -1 : parseInt(whiteThresh),
        uploadToCloudflare: true,
        originalFilename: uploadFilename,
        originalCarId: image.carId,
      })) as ExtendCanvasResponse;

      if (result.cloudflareUpload) {
        setCloudflareResult(result.cloudflareUpload);

        if (result.cloudflareUpload.success) {
          const resolutionText =
            highResImageUrl && highResMultiplier
              ? ` (${highResMultiplier}x high-resolution)`
              : "";
          toast({
            title: "Success",
            description: `Image uploaded to Cloudflare as "${result.cloudflareUpload.filename}"${resolutionText}`,
          });
        } else {
          toast({
            title: "Upload Failed",
            description:
              result.cloudflareUpload.error || "Failed to upload to Cloudflare",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Upload Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = () => {
    if (processedImageUrl) {
      // Convert data URL to blob for better download handling
      fetch(processedImageUrl)
        .then((res) => res.blob())
        .then((blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `extended_${image?.filename || "image"}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        })
        .catch(() => {
          // Fallback to direct download
          const link = document.createElement("a");
          link.href = processedImageUrl;
          link.download = `extended_${image?.filename || "image"}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        });
    }
  };

  const handleHighResDownload = () => {
    console.log("High-res download triggered:", {
      highResImageUrl: highResImageUrl ? "exists" : "null",
      highResMultiplier,
      imageFilename: image?.filename,
    });

    if (highResImageUrl && highResMultiplier) {
      // Convert data URL to blob for better download handling
      fetch(highResImageUrl)
        .then((res) => res.blob())
        .then((blob) => {
          console.log("Blob created successfully:", blob.size, "bytes");
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
    } else {
      console.error("Missing required data for high-res download:", {
        highResImageUrl: !!highResImageUrl,
        highResMultiplier,
      });
    }
  };

  const handleViewInGallery = () => {
    if (cloudflareResult?.success) {
      // Refresh the page to show the new image in the gallery
      window.location.reload();
    }
  };

  const handleReset = () => {
    setProcessedImageUrl(null);
    setProcessedDimensions(null);
    setHighResImageUrl(null);
    setHighResDimensions(null);
    setHighResMultiplier(null);
    setCloudflareResult(null);
    setDesiredHeight("1200");
    setPaddingPct("0.05");
    setWhiteThresh("90");
    setCloudflareWidth("2000");
    setCloudflareQuality("100");
    setImageLoadError(false);
    setProcessedImageLoadError(false);
    setUseTestImage(false);
  };

  const handleClose = () => {
    handleReset();
    setOriginalDimensions(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Canvas Extension</DialogTitle>
          <DialogDescription>
            Auto-extend the vertical canvas of studio car photos. The program
            detects the car and its shadow, preserves configurable padding, then
            stretches the remaining background to reach the target height.
          </DialogDescription>
        </DialogHeader>

        {/* Car Association Indicator */}
        {image && (
          <div className="mx-6 -mt-2 mb-4">
            {image.carId && image.carId !== "" ? (
              <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <Car className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  This image is associated with a car
                </span>
                <span className="text-xs text-blue-600/80 dark:text-blue-400/80 ml-auto">
                  Processed images will be linked to the car
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-gray-500/10 border border-gray-500/20 rounded-lg">
                <Car className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  This image is not associated with any car
                </span>
                <span className="text-xs text-gray-600/80 dark:text-gray-400/80 ml-auto">
                  Processed images will be standalone
                </span>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left side - Controls */}
          <div className="space-y-4">
            <div className="space-y-4">
              {/* Cloudflare Image Quality Controls */}
              <div className="p-3 border rounded-lg bg-muted/30">
                <Label className="text-sm font-medium mb-2 block">
                  Original Image Quality
                </Label>

                {/* PHASE 1 DEBUG: Test Image Toggle */}
                <div className="mb-3 p-2 border border-dashed border-blue-300 rounded bg-blue-50">
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="checkbox"
                      id="useTestImageCanvas"
                      checked={useTestImage}
                      onChange={(e) => setUseTestImage(e.target.checked)}
                      className="rounded"
                    />
                    <Label
                      htmlFor="useTestImageCanvas"
                      className="text-xs text-blue-700 font-medium"
                    >
                      🧪 Use Test Image (Debug Mode)
                    </Label>
                  </div>
                  <p className="text-xs text-blue-600">
                    Toggle to test with a known-good placeholder image
                  </p>
                </div>

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

              <Button
                onClick={handleProcess}
                disabled={isProcessing || !image}
                variant="outline"
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Process Image"
                )}
              </Button>

              {/* Cloudflare Upload Status */}
              {cloudflareResult && (
                <div
                  className={`p-3 rounded-lg border ${
                    cloudflareResult.success
                      ? "bg-green-500/10 border-green-500/20 dark:bg-green-500/10 dark:border-green-500/20"
                      : "bg-red-500/10 border-red-500/20 dark:bg-red-500/10 dark:border-red-500/20"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {cloudflareResult.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    )}
                    <span
                      className={`text-sm font-medium ${
                        cloudflareResult.success
                          ? "text-green-700 dark:text-green-300"
                          : "text-red-700 dark:text-red-300"
                      }`}
                    >
                      {cloudflareResult.success
                        ? "Uploaded to Cloudflare"
                        : "Upload Failed"}
                    </span>
                  </div>
                  {cloudflareResult.success && cloudflareResult.filename && (
                    <p className="text-xs text-green-600/80 dark:text-green-400/80 mt-1">
                      Saved as: {cloudflareResult.filename}
                    </p>
                  )}
                  {!cloudflareResult.success && cloudflareResult.error && (
                    <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1">
                      Error: {cloudflareResult.error}
                    </p>
                  )}
                </div>
              )}

              {processedImageUrl && (
                <div className="space-y-2">
                  {/* High-Resolution Processing Section */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => handleHighResProcess(2)}
                      disabled={isProcessingHighRes}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      {isProcessingHighRes && highResMultiplier === 2 ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          2x...
                        </>
                      ) : (
                        "Generate 2x"
                      )}
                    </Button>

                    <Button
                      onClick={() => handleHighResProcess(4)}
                      disabled={isProcessingHighRes}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      {isProcessingHighRes && highResMultiplier === 4 ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          4x...
                        </>
                      ) : (
                        "Generate 4x"
                      )}
                    </Button>
                  </div>

                  {!cloudflareResult?.success && (
                    <>
                      {image?.carId && (
                        <p className="text-xs text-muted-foreground text-center">
                          Processed image will be associated with this car
                        </p>
                      )}
                      <Button
                        onClick={handleUploadToCloudflare}
                        disabled={isUploading}
                        variant="outline"
                        className="w-full"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Upload to Cloudflare
                          </>
                        )}
                      </Button>
                    </>
                  )}

                  {cloudflareResult?.success && (
                    <Button
                      onClick={handleViewInGallery}
                      variant="outline"
                      className="w-full"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View in Gallery
                    </Button>
                  )}

                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="w-full"
                  >
                    Reset
                  </Button>
                </div>
              )}
            </div>
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
              {currentImageUrl && (
                <div className="mt-2 border rounded-lg overflow-hidden bg-muted flex items-center justify-center min-h-[300px]">
                  <div className="relative max-w-full max-h-[600px]">
                    {!imageLoadError ? (
                      <Image
                        src={currentImageUrl}
                        alt={image?.filename || "Original image"}
                        width={0}
                        height={0}
                        sizes="100vw"
                        className="w-auto h-auto max-w-full max-h-[600px] object-contain"
                        style={{ width: "auto", height: "auto" }}
                        key={currentImageUrl} // Force reload when URL changes
                        onError={(e) => {
                          console.error(
                            "🚨 DETAILED IMAGE LOAD ERROR ANALYSIS:",
                            {
                              errorType: "Next.js Image component",
                              attemptedSrc: currentImageUrl,
                              imageObject: image,
                              errorEvent: e,
                              errorEventType: e.type,
                              errorEventTarget: e.currentTarget,
                              targetSrc: e.currentTarget.src,
                              targetComplete: e.currentTarget.complete,
                              targetNaturalWidth: e.currentTarget.naturalWidth,
                              targetNaturalHeight:
                                e.currentTarget.naturalHeight,
                              currentImageUrl,
                              enhancedImageUrl,
                              useTestImage,
                              isTestImage: currentImageUrl === testImageUrl,
                              urlValidation: {
                                isString: typeof currentImageUrl === "string",
                                isNotEmpty:
                                  !!currentImageUrl &&
                                  currentImageUrl.length > 0,
                                startsWithHttp:
                                  currentImageUrl?.startsWith("http"),
                                containsImageDelivery:
                                  currentImageUrl?.includes(
                                    "imagedelivery.net"
                                  ),
                                containsPlaceholder:
                                  currentImageUrl?.includes("placehold.co"),
                              },
                            }
                          );
                          setImageLoadError(true);
                          // Try to fallback to original URL without transformations
                          if (currentImageUrl !== image?.url && image?.url) {
                            console.log(
                              "🔄 Attempting fallback to original URL:",
                              image.url
                            );
                            e.currentTarget.src = image.url;
                          }
                        }}
                        onLoad={(e) => {
                          console.log("✅ SUCCESSFUL IMAGE LOAD ANALYSIS:", {
                            src: currentImageUrl,
                            naturalWidth: e.currentTarget.naturalWidth,
                            naturalHeight: e.currentTarget.naturalHeight,
                            isTestImage: currentImageUrl === testImageUrl,
                            loadedSuccessfully: true,
                            useTestImage,
                            imageObject: image,
                          });
                          setImageLoadError(false);
                        }}
                        unoptimized={
                          !currentImageUrl.includes("imagedelivery.net")
                        }
                      />
                    ) : (
                      <img
                        src={image?.url || currentImageUrl}
                        alt={image?.filename || "Original image"}
                        className="w-auto h-auto max-w-full max-h-[600px] object-contain"
                        style={{ width: "auto", height: "auto" }}
                        onError={(e) => {
                          console.error("🚨 FALLBACK IMG TAG ERROR ANALYSIS:", {
                            errorType: "HTML img tag fallback",
                            attemptedSrc: e.currentTarget.src,
                            imageObject: image,
                            originalSrc: image?.url,
                            currentImageUrl,
                            fallbackAttempted: true,
                            urlValidation: {
                              isString: typeof e.currentTarget.src === "string",
                              isNotEmpty:
                                !!e.currentTarget.src &&
                                e.currentTarget.src.length > 0,
                              startsWithHttp:
                                e.currentTarget.src?.startsWith("http"),
                              containsImageDelivery:
                                e.currentTarget.src?.includes(
                                  "imagedelivery.net"
                                ),
                            },
                          });
                        }}
                        onLoad={(e) => {
                          console.log("✅ FALLBACK IMG TAG SUCCESS:", {
                            src: e.currentTarget.src,
                            naturalWidth: e.currentTarget.naturalWidth,
                            naturalHeight: e.currentTarget.naturalHeight,
                            fallbackWorked: true,
                            imageObject: image,
                          });
                        }}
                      />
                    )}
                  </div>
                </div>
              )}
              {!currentImageUrl && (
                <div className="mt-2 border rounded-lg overflow-hidden bg-muted flex items-center justify-center min-h-[300px]">
                  <div className="text-center text-muted-foreground">
                    <Eye className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">No image URL available</p>
                    {image?.url && (
                      <p className="text-xs mt-1">Original: {image.url}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right side - Processed Image */}
          <div className="space-y-4">
            <div>
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
              <div className="mt-2 border rounded-lg overflow-hidden bg-muted flex items-center justify-center min-h-[300px]">
                {highResImageUrl || processedImageUrl ? (
                  <div className="relative max-w-full max-h-[600px]">
                    {!processedImageLoadError ? (
                      <Image
                        src={(highResImageUrl || processedImageUrl)!}
                        alt={
                          highResImageUrl
                            ? "High-resolution processed image"
                            : "Processed image"
                        }
                        width={0}
                        height={0}
                        sizes="100vw"
                        className="w-auto h-auto max-w-full max-h-[600px] object-contain"
                        style={{ width: "auto", height: "auto" }}
                        onError={(e) => {
                          const src = (highResImageUrl || processedImageUrl)!;
                          console.error("Processed image failed to load:", {
                            src: src,
                            isHighRes: !!highResImageUrl,
                            error: e,
                          });
                          setProcessedImageLoadError(true);
                        }}
                        onLoad={(e) => {
                          console.log("Processed image loaded successfully:", {
                            src: (highResImageUrl || processedImageUrl)!,
                            naturalWidth: e.currentTarget.naturalWidth,
                            naturalHeight: e.currentTarget.naturalHeight,
                            isHighRes: !!highResImageUrl,
                          });
                          setProcessedImageLoadError(false);
                        }}
                        unoptimized={true} // Processed images are likely data URLs or local files
                      />
                    ) : (
                      <img
                        src={(highResImageUrl || processedImageUrl)!}
                        alt={
                          highResImageUrl
                            ? "High-resolution processed image"
                            : "Processed image"
                        }
                        className="w-auto h-auto max-w-full max-h-[600px] object-contain"
                        style={{ width: "auto", height: "auto" }}
                        onError={(e) => {
                          console.error("🚨 FALLBACK IMG TAG ERROR ANALYSIS:", {
                            errorType: "HTML img tag fallback",
                            attemptedSrc: e.currentTarget.src,
                            imageObject: image,
                            originalSrc: image?.url,
                            currentImageUrl,
                            fallbackAttempted: true,
                            urlValidation: {
                              isString: typeof e.currentTarget.src === "string",
                              isNotEmpty:
                                !!e.currentTarget.src &&
                                e.currentTarget.src.length > 0,
                              startsWithHttp:
                                e.currentTarget.src?.startsWith("http"),
                              containsImageDelivery:
                                e.currentTarget.src?.includes(
                                  "imagedelivery.net"
                                ),
                            },
                          });
                        }}
                        onLoad={(e) => {
                          console.log("✅ FALLBACK IMG TAG SUCCESS:", {
                            src: e.currentTarget.src,
                            naturalWidth: e.currentTarget.naturalWidth,
                            naturalHeight: e.currentTarget.naturalHeight,
                            fallbackWorked: true,
                            imageObject: image,
                          });
                        }}
                      />
                    )}
                    {highResImageUrl && (
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium">
                        {highResMultiplier}x High-Res
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
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
              {processedImageUrl && (
                <div className="flex gap-2 mt-2">
                  {highResImageUrl ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setHighResImageUrl(null);
                          setHighResDimensions(null);
                        }}
                        className="flex-1 text-xs"
                      >
                        Show Standard
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleHighResDownload}
                        className="flex-1 text-xs"
                      >
                        <Download className="mr-1 h-3 w-3" />
                        Download {highResMultiplier}x
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleDownload}
                      className="w-full text-xs"
                    >
                      <Download className="mr-1 h-3 w-3" />
                      Download Standard
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
