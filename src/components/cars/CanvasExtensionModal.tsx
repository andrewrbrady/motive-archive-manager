import React, { useState, useEffect, useMemo } from "react";
import { ImageData } from "@/app/images/columns";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
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
  ZoomIn,
  Palette,
  Check,
  X,
  RotateCcw,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import Image from "next/image";
import { useAPI } from "@/hooks/useAPI";
import { useGalleryImageProcessing } from "@/lib/hooks/useGalleryImageProcessing";
import { toast as hotToast } from "react-hot-toast";
import { getFormattedImageUrl } from "@/lib/cloudflare";
import { ImageProcessingModalHeader } from "./shared/ImageProcessingModalHeader";
import { ImageProcessingModalFooter } from "./shared/ImageProcessingModalFooter";
import { ImageDisplayWindow } from "./shared/ImageDisplayWindow";
import { PresetSizes } from "./shared/PresetSizes";

interface CanvasExtensionModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: ImageData | null;
  // New optional props for preview workflow
  enablePreview?: boolean;
  galleryId?: string;
  onImageReplaced?: (originalImageId: string, newImageData: any) => void;
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

interface ProcessedImageData {
  _id: string;
  url: string;
  filename: string;
  metadata: any;
  carId: string;
}

interface ExtendCanvasData {
  imageUrl: string;
  desiredHeight: number;
  paddingPct: number;
  whiteThresh: number;
  uploadToCloudflare: boolean;
  originalFilename: string;
  requestedWidth: number;
  requestedHeight: number;
  scaleMultiplier: number;
}

export function CanvasExtensionModal({
  isOpen,
  onClose,
  image,
  enablePreview = false,
  galleryId,
  onImageReplaced,
}: CanvasExtensionModalProps) {
  // All hooks must be declared first - no early returns allowed
  const api = useAPI();

  // Gallery processing hooks
  const {
    previewProcessImage,
    replaceImageInGallery,
    isProcessing: isGalleryProcessing,
    isReplacing,
  } = useGalleryImageProcessing();

  // Gallery preview workflow state
  const [processedImage, setProcessedImage] =
    useState<ProcessedImageData | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Canvas extension settings
  const [desiredHeight, setDesiredHeight] = useState<string>("1200");
  const [paddingPct, setPaddingPct] = useState<string>("0.05");
  const [whiteThresh, setWhiteThresh] = useState<string>("90");

  // Cloudflare settings
  const [cloudflareWidth, setCloudflareWidth] = useState<string>("2000");
  const [cloudflareQuality, setCloudflareQuality] = useState<string>("100");

  // State management
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessingHighRes, setIsProcessingHighRes] = useState(false);
  const [highResMultiplier, setHighResMultiplier] = useState<number | null>(
    null
  );

  // Image URLs and dimensions
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

  // Upload and status
  const [cloudflareResult, setCloudflareResult] =
    useState<CloudflareUploadResult | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [remoteServiceUsed, setRemoteServiceUsed] = useState<boolean>(false);
  const [imageLoadError, setImageLoadError] = useState<boolean>(false);
  const [processedImageLoadError, setProcessedImageLoadError] =
    useState<boolean>(false);

  // Debug features
  const [useTestImage, setUseTestImage] = useState<boolean>(false);

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
      if (baseUrl.endsWith("/public") || baseUrl.match(/\/[a-zA-Z]+$/)) {
        const urlParts = baseUrl.split("/");
        urlParts[urlParts.length - 1] = params.join(",");
        return urlParts.join("/");
      } else {
        return `${baseUrl}/${params.join(",")}`;
      }
    }

    return baseUrl.replace(/\/public$/, `/${params.join(",")}`);
  };

  // Get gallery processing URL (strips Cloudflare transforms for API calls)
  const getProcessingImageUrl = (baseUrl: string) => {
    if (!baseUrl.includes("imagedelivery.net")) {
      return baseUrl;
    }

    const urlParts = baseUrl.split("/");
    const baseUrlWithoutVariant = urlParts.slice(0, -1).join("/");
    return `${baseUrlWithoutVariant}/public`;
  };

  // Test image URL for debugging
  const testImageUrl =
    "https://imagedelivery.net/DPuFizKWBZCkvs8FG_hh3A/6b46d5c0-bf1c-48e4-92d3-cd0a16d3e700/public";

  // Get the enhanced image URL for display
  const enhancedImageUrl = useMemo(() => {
    if (!image?.url) return null;
    if (useTestImage) return testImageUrl;
    return getEnhancedImageUrl(image.url, cloudflareWidth, cloudflareQuality);
  }, [image?.url, cloudflareWidth, cloudflareQuality, useTestImage]);

  // Get current image URL for display
  const currentImageUrl = useTestImage ? testImageUrl : enhancedImageUrl;

  // Set up dimensions on image load
  useEffect(() => {
    if (currentImageUrl) {
      const img = new window.Image();
      img.onload = () => {
        setOriginalDimensions({
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };
      img.src = currentImageUrl;
    }
  }, [currentImageUrl]);

  // Note: api is now guaranteed to be available from useAPI hook

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
        uploadToCloudflare: false,
        originalFilename: image.filename,
      })) as ExtendCanvasResponse;

      if (result.success) {
        setProcessedImageUrl(result.processedImageUrl);
        setProcessingStatus("completed");

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
    if (!image || !enhancedImageUrl || !api) return;

    setIsProcessingHighRes(true);
    setHighResMultiplier(multiplier);

    try {
      const highResCloudflareWidth = parseInt(cloudflareWidth) * multiplier;
      const highResDesiredHeight = parseInt(desiredHeight) * multiplier;
      const highResSourceUrl = getEnhancedImageUrl(
        image.url,
        highResCloudflareWidth.toString(),
        cloudflareQuality
      );

      const result = (await api.post("images/extend-canvas", {
        imageUrl: highResSourceUrl,
        desiredHeight: highResDesiredHeight,
        paddingPct: parseFloat(paddingPct),
        whiteThresh: whiteThresh === "-1" ? -1 : parseInt(whiteThresh),
        uploadToCloudflare: false,
        originalFilename: image.filename,
      })) as ExtendCanvasResponse;

      if (result.success) {
        setHighResImageUrl(result.processedImageUrl);
        toast({
          title: "Success",
          description: `${multiplier}x high-resolution image generated`,
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "High-resolution processing failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate high-resolution image",
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
      let uploadHeight = parseInt(desiredHeight);
      let uploadSourceUrl = enhancedImageUrl;
      let uploadFilename = image.filename;

      if (highResImageUrl && highResMultiplier && processedDimensions) {
        uploadHeight = processedDimensions.height * highResMultiplier;
        const highResCloudflareWidth =
          parseInt(cloudflareWidth) * highResMultiplier;
        uploadSourceUrl = getEnhancedImageUrl(
          image.url,
          highResCloudflareWidth.toString(),
          cloudflareQuality
        );

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
    if (highResImageUrl) {
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
        .catch(() => {
          const link = document.createElement("a");
          link.href = highResImageUrl;
          link.download = `extended_${highResMultiplier}x_${image?.filename || "image"}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        });
    }
  };

  const handleViewInGallery = () => {
    if (cloudflareResult?.imageUrl) {
      window.open(cloudflareResult.imageUrl, "_blank");
    }
  };

  const handlePreview = async () => {
    if (!image || !enhancedImageUrl) return;
    if (!enablePreview || !galleryId || !previewProcessImage) return;

    const processingImageUrl = getProcessingImageUrl(image.url);

    console.log("🖼️ Canvas Extension processing starting:", {
      originalUrl: image.url,
      enhancedUrl: enhancedImageUrl.substring(0, 100) + "...",
      processingUrl: processingImageUrl,
      parameters: {
        desiredHeight: parseInt(desiredHeight),
        paddingPct: parseFloat(paddingPct),
        whiteThresh: whiteThresh === "-1" ? -1 : parseInt(whiteThresh),
      },
    });

    const parameters = {
      imageUrl: processingImageUrl,
      desiredHeight: parseInt(desiredHeight),
      paddingPct: parseFloat(paddingPct),
      whiteThresh: whiteThresh === "-1" ? -1 : parseInt(whiteThresh),
    };

    try {
      const result = await previewProcessImage({
        galleryId,
        imageId: image._id,
        processingType: "canvas-extension",
        parameters,
      });

      if (result && result.success) {
        console.log("✅ Canvas Extension processing completed successfully");
        setProcessedImage(result.processedImage);
        setShowPreview(true);
      } else {
        console.error("❌ Canvas Extension processing failed:", {
          hasResult: !!result,
          success: result?.success,
          message: result
            ? "Processing returned false success"
            : "No result returned",
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      const errorMessage =
        (error as any)?.message || (error as any)?.error || "Unknown error";
      const errorDetails =
        (error as any)?.response?.data || (error as any)?.data || error;
      console.error("❌ Canvas Extension processing error:", {
        message: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const handleReplaceImage = async () => {
    if (!api) return;
    if (!image || !processedImage) return;
    if (
      !enablePreview ||
      !galleryId ||
      !replaceImageInGallery ||
      !onImageReplaced
    )
      return;

    const processingImageUrl = getProcessingImageUrl(image.url);

    console.log("🔄 Canvas Extension replacement starting:", {
      originalUrl: image.url,
      processingUrl: processingImageUrl,
    });

    const parameters = {
      imageUrl: processingImageUrl,
      desiredHeight: parseInt(desiredHeight),
      paddingPct: parseFloat(paddingPct),
      whiteThresh: whiteThresh === "-1" ? -1 : parseInt(whiteThresh),
    };

    try {
      const result = await replaceImageInGallery(
        galleryId,
        image._id,
        "canvas-extension",
        parameters
      );

      if (result && result.success && onImageReplaced) {
        console.log("✅ Canvas Extension replacement completed successfully");
        onImageReplaced(result.originalImageId, result.processedImage);
        handleClose();
      } else {
        console.error("❌ Canvas Extension replacement failed:", {
          hasResult: !!result,
          success: result?.success,
          hasCallback: !!onImageReplaced,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      const errorMessage =
        (error as any)?.message || (error as any)?.error || "Unknown error";
      const errorDetails =
        (error as any)?.response?.data || (error as any)?.data || error;
      console.error("❌ Canvas Extension replacement error:", {
        message: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const handleDiscardPreview = () => {
    setProcessedImage(null);
    setShowPreview(false);
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
    setProcessedImage(null);
    setShowPreview(false);
  };

  const handleClose = () => {
    handleReset();
    setOriginalDimensions(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[85vh] mx-4 overflow-hidden flex flex-col">
        <ImageProcessingModalHeader
          icon={<ZoomIn className="h-5 w-5" />}
          title="Canvas Extension Tool"
          description="Auto-extend the vertical canvas of studio car photos. The program detects the car and its shadow, preserves configurable padding, then stretches the remaining background to reach the target height."
          image={image}
          processingStatus={processingStatus}
          error={error}
          cloudflareResult={cloudflareResult}
        />

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4 p-1">
            {/* Top Row: Image Preview Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left: Original Image */}
              <ImageDisplayWindow
                title="Original Image"
                imageUrl={currentImageUrl}
                altText={image?.filename || "Original image"}
                dimensions={originalDimensions}
                loadError={imageLoadError}
                onError={(e) => {
                  console.error("Image load error:", e);
                  setImageLoadError(true);
                }}
                onLoad={(e) => {
                  console.log("Image loaded successfully");
                  setImageLoadError(false);
                }}
                fallbackContent={
                  <div className="text-center">
                    <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No image selected</p>
                    {image?.url && (
                      <p className="text-xs mt-1">Original: {image.url}</p>
                    )}
                  </div>
                }
              />

              {/* Right: Processed Image */}
              <ImageDisplayWindow
                title={
                  highResImageUrl
                    ? `High-Res Extended (${highResMultiplier}x)`
                    : "Extended Canvas"
                }
                imageUrl={
                  enablePreview && processedImage?.url
                    ? processedImage.url
                    : highResImageUrl || processedImageUrl
                }
                altText={
                  highResImageUrl
                    ? "High-resolution extended canvas"
                    : "Extended canvas"
                }
                dimensions={highResDimensions || processedDimensions}
                loadError={processedImageLoadError}
                onError={(e) => {
                  console.error("Processed image load error:", e);
                  setProcessedImageLoadError(true);
                }}
                onLoad={(e) => {
                  console.log("Processed image loaded successfully");
                  setProcessedImageLoadError(false);
                }}
                fallbackContent={
                  <div className="text-center">
                    <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Extended canvas will appear here</p>
                  </div>
                }
                showGalleryPreview={
                  !!(
                    enablePreview &&
                    galleryId &&
                    showPreview &&
                    processedImage
                  )
                }
              />
            </div>

            {/* Bottom Row: Settings in Two-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left Column: Canvas Extension Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">
                  Canvas Extension Settings
                </h3>

                {/* Desired Height */}
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
                </div>

                {/* Preset Sizes */}
                <PresetSizes
                  onSizeSelect={(width, height) => {
                    setDesiredHeight(height.toString());
                    setCloudflareWidth(width.toString());
                  }}
                />

                {/* Padding Percentage */}
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

                {/* White Threshold */}
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
              </div>

              {/* Right Column: Processing Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Processing Settings</h3>

                {/* Original Image Quality Controls */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
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

                {/* Debug Section - Test Image Toggle */}
                <div className="p-2 border border-dashed border-blue-300 rounded bg-blue-50">
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
              </div>
            </div>
          </div>
        </div>

        <ImageProcessingModalFooter
          enablePreview={enablePreview}
          galleryId={galleryId}
          showPreview={showPreview}
          processedImage={processedImage}
          isGalleryProcessing={isGalleryProcessing}
          isReplacing={isReplacing}
          isProcessing={isProcessing}
          isProcessingHighRes={isProcessingHighRes}
          highResMultiplier={highResMultiplier}
          isUploading={isUploading}
          processedImageUrl={processedImageUrl}
          highResImageUrl={highResImageUrl}
          cloudflareResult={cloudflareResult}
          onPreview={handlePreview}
          onReplaceImage={handleReplaceImage}
          onDiscardPreview={handleDiscardPreview}
          onProcess={handleProcess}
          onHighResProcess={handleHighResProcess}
          onDownload={handleDownload}
          onHighResDownload={handleHighResDownload}
          onUploadToCloudflare={handleUploadToCloudflare}
          onViewInGallery={handleViewInGallery}
          onReset={handleReset}
          onClose={handleClose}
          canProcess={!!image}
          processButtonContent={{
            idle: {
              icon: <ZoomIn className="mr-2 h-4 w-4" />,
              text: "Extend Canvas",
            },
            processing: { text: "Extending Canvas..." },
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
