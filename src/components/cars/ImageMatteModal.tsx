import React, { useState, useEffect, useMemo } from "react";
import { ImageData } from "@/app/images/columns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Download,
  Eye,
  Upload,
  CheckCircle,
  XCircle,
  ExternalLink,
  Car,
  Palette,
  Check,
  X,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import Image from "next/image";
import { useAPI } from "@/hooks/useAPI";
import { useGalleryImageProcessing } from "@/lib/hooks/useGalleryImageProcessing";
import { ImageProcessingModalHeader } from "./shared/ImageProcessingModalHeader";
import { ImageProcessingModalFooter } from "./shared/ImageProcessingModalFooter";
import { ImageDisplayWindow } from "@/components/ui/image-processing/ImageDisplayWindow";
import { PresetSizes } from "@/components/ui/image-processing/PresetSizes";

interface ImageMatteModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: ImageData | null;
  // Optional props for gallery usage (not implemented yet)
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

interface ProcessedImageData {
  _id: string;
  url: string;
  filename: string;
  metadata: any;
  carId: string;
}

interface CreateMatteResponse {
  processedImageUrl: string;
  remoteServiceUsed?: boolean;
  message?: string;
  cloudflareUpload?: CloudflareUploadResult;
}

export function ImageMatteModal({
  isOpen,
  onClose,
  image,
  enablePreview,
  galleryId,
  onImageReplaced,
}: ImageMatteModalProps) {
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

  const [canvasWidth, setCanvasWidth] = useState<string>("1920");
  const [canvasHeight, setCanvasHeight] = useState<string>("1080");
  const [paddingPercent, setPaddingPercent] = useState<string>("0");
  const [matteColor, setMatteColor] = useState<string>("#000000");
  const [cloudflareWidth, setCloudflareWidth] = useState<string>("2000");
  const [cloudflareQuality, setCloudflareQuality] = useState<string>("100");

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

  // Get gallery processing URL (strips Cloudflare transforms for API calls)
  const getGalleryProcessingImageUrl = (baseUrl: string): string => {
    if (!baseUrl.includes("imagedelivery.net")) {
      return baseUrl;
    }

    // For Cloudflare URLs, ensure we use the /public variant for processing
    const urlParts = baseUrl.split("/");
    const baseUrlWithoutVariant = urlParts.slice(0, -1).join("/");
    return `${baseUrlWithoutVariant}/public`;
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
        enhancedImageUrl,
        isCloudflareUrl: enhancedImageUrl.includes("imagedelivery.net"),
      });
    }
  }, [enhancedImageUrl]);

  // PHASE 1 DEBUGGING: Complete image data structure investigation
  useEffect(() => {
    console.log("=== IMAGE MATTE MODAL - PHASE 1 DEBUG START ===");
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

    console.log("=== IMAGE MATTE MODAL - PHASE 1 DEBUG END ===");
  }, [image, cloudflareWidth, cloudflareQuality]);

  // PHASE 1 TESTING: Hardcoded test image URL
  const testImageUrl =
    "https://placehold.co/800x600/000000/FFFFFF?text=Test+Image";

  // Get the current enhanced image URL for display
  const currentImageUrl = useTestImage ? testImageUrl : enhancedImageUrl;

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

  // Reset error states when image changes
  useEffect(() => {
    setImageLoadError(false);
    setProcessedImageLoadError(false);
  }, [image?.url]);

  // Note: api is now guaranteed to be available from useAPI hook

  const handleProcess = async () => {
    if (!image || !enhancedImageUrl || !api) return;

    setIsProcessing(true);
    setProcessedImageUrl(null);
    setProcessedDimensions(null);
    setHighResImageUrl(null);
    setHighResDimensions(null);
    setHighResMultiplier(null);
    setCloudflareResult(null);
    setError(null);
    setRemoteServiceUsed(false);

    try {
      const result = (await api.post("images/create-matte", {
        imageUrl: enhancedImageUrl,
        canvasWidth: parseInt(canvasWidth),
        canvasHeight: parseInt(canvasHeight),
        paddingPercent: parseFloat(paddingPercent),
        matteColor,
        uploadToCloudflare: false,
        originalFilename: image.filename,
      })) as CreateMatteResponse;

      setProcessedImageUrl(result.processedImageUrl);
      setRemoteServiceUsed(result.remoteServiceUsed || false);

      toast({
        title: "Success",
        description: result.remoteServiceUsed
          ? "Image matte created successfully with Cloud Run service"
          : result.message || "Image matte created successfully",
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
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
          link.download = `matte_${canvasWidth}x${canvasHeight}_${image?.filename || "image"}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        })
        .catch((error) => {
          console.error("Download failed:", error);
          // Fallback to direct download
          const link = document.createElement("a");
          link.href = processedImageUrl;
          link.download = `matte_${canvasWidth}x${canvasHeight}_${image?.filename || "image"}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        });
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
      const targetWidth = parseInt(canvasWidth) * multiplier;
      const targetHeight = parseInt(canvasHeight) * multiplier;

      // Get the high-resolution source image from Cloudflare
      const highResCloudflareWidth = parseInt(cloudflareWidth) * multiplier;
      const highResSourceUrl = getEnhancedImageUrl(
        image.url,
        highResCloudflareWidth.toString(),
        cloudflareQuality
      );

      const result = (await api.post("images/create-matte", {
        imageUrl: highResSourceUrl,
        canvasWidth: targetWidth,
        canvasHeight: targetHeight,
        paddingPercent: parseFloat(paddingPercent),
        matteColor,
        uploadToCloudflare: false,
        originalFilename: image.filename,
      })) as CreateMatteResponse;

      setHighResImageUrl(result.processedImageUrl);

      toast({
        title: "Success",
        description: `${multiplier}x high-resolution matte created successfully (${targetWidth}×${targetHeight})`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to process ${multiplier}x high-resolution matte`,
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
      let uploadWidth = parseInt(canvasWidth);
      let uploadHeight = parseInt(canvasHeight);
      let uploadSourceUrl = enhancedImageUrl;
      let uploadFilename = image.filename;

      if (highResImageUrl && highResMultiplier) {
        // Use high-resolution parameters
        uploadWidth = parseInt(canvasWidth) * highResMultiplier;
        uploadHeight = parseInt(canvasHeight) * highResMultiplier;
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
        uploadFilename = `${nameWithoutExt}_matte_${highResMultiplier}x.${ext}`;
      }

      const result = (await api.post("images/create-matte", {
        imageUrl: uploadSourceUrl,
        canvasWidth: uploadWidth,
        canvasHeight: uploadHeight,
        paddingPercent: parseFloat(paddingPercent),
        matteColor,
        uploadToCloudflare: true,
        originalFilename: uploadFilename,
        originalCarId: image.carId,
      })) as CreateMatteResponse;

      if (result.cloudflareUpload?.success) {
        setCloudflareResult(result.cloudflareUpload);
        toast({
          title: "Success",
          description: "Image matte uploaded to Cloudflare successfully",
        });
      } else {
        throw new Error(result.cloudflareUpload?.error || "Upload failed");
      }
    } catch (error) {
      toast({
        title: "Upload Error",
        description:
          error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
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
          link.download = `matte_${highResMultiplier}x_${image?.filename || "image"}`;
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
          link.download = `matte_${highResMultiplier}x_${image?.filename || "image"}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
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
    setCanvasWidth("1920");
    setCanvasHeight("1080");
    setPaddingPercent("0");
    setMatteColor("#000000");
    setCloudflareWidth("2000");
    setCloudflareQuality("100");
    setImageLoadError(false);
    setProcessedImageLoadError(false);
    // Reset gallery preview workflow state
    setProcessedImage(null);
    setShowPreview(false);
  };

  const handleClose = () => {
    handleReset();
    setOriginalDimensions(null);
    // Reset gallery preview workflow state
    setProcessedImage(null);
    setShowPreview(false);
    onClose();
  };

  // Gallery preview and replace handlers
  const handlePreview = async () => {
    if (!image || !enhancedImageUrl) return;
    if (!enablePreview || !galleryId || !previewProcessImage) return;

    // Use gallery processing URL for API calls
    const processingImageUrl = getGalleryProcessingImageUrl(image.url);

    console.log("🖼️ Image Matte processing starting:", {
      originalUrl: image.url,
      enhancedUrl: enhancedImageUrl.substring(0, 100) + "...",
      processingUrl: processingImageUrl,
      parameters: {
        canvasWidth: parseInt(canvasWidth),
        canvasHeight: parseInt(canvasHeight),
        paddingPercent: parseFloat(paddingPercent),
        matteColor: matteColor,
      },
    });

    const parameters = {
      imageUrl: processingImageUrl,
      canvasWidth: parseInt(canvasWidth),
      canvasHeight: parseInt(canvasHeight),
      paddingPercent: parseFloat(paddingPercent),
      matteColor: matteColor,
    };

    try {
      const result = await previewProcessImage({
        galleryId,
        imageId: image._id,
        processingType: "image-matte",
        parameters,
      });

      if (result && result.success) {
        console.log("✅ Image Matte processing completed successfully");
        setProcessedImage(result.processedImage);
        setShowPreview(true);
      } else {
        console.error("❌ Image Matte processing failed:", {
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
      console.error("❌ Image Matte processing error:", {
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

    const processingImageUrl = getGalleryProcessingImageUrl(image.url);

    console.log("🔄 Image Matte replacement starting:", {
      originalUrl: image.url,
      processingUrl: processingImageUrl,
    });

    const parameters = {
      imageUrl: processingImageUrl,
      canvasWidth: parseInt(canvasWidth),
      canvasHeight: parseInt(canvasHeight),
      paddingPercent: parseFloat(paddingPercent),
      matteColor: matteColor,
    };

    try {
      const result = await replaceImageInGallery(
        galleryId,
        image._id,
        "image-matte",
        parameters
      );

      if (result && result.success && onImageReplaced) {
        console.log("✅ Image Matte replacement completed successfully");
        onImageReplaced(result.originalImageId, result.processedImage);
        handleClose();
      } else {
        console.error("❌ Image Matte replacement failed:", {
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
      console.error("❌ Image Matte replacement error:", {
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[85vh] mx-4 overflow-hidden flex flex-col">
        <ImageProcessingModalHeader
          icon={<Palette className="h-5 w-5" />}
          title="Image Matte Tool"
          description="Create a custom matte for your image by placing it on a colored canvas with specified dimensions."
          image={image}
          processingStatus={processingStatus}
          error={error}
          cloudflareResult={cloudflareResult}
        />

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4 p-1">
            {/* Top Row: Image Preview and Live Preview Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left: Original Image */}
              <ImageDisplayWindow
                title="Original Image"
                imageUrl={enhancedImageUrl}
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
                    ? `High-Res Matte (${highResMultiplier}x)`
                    : "Processed Matte"
                }
                imageUrl={highResImageUrl || processedImageUrl}
                altText={
                  highResImageUrl ? "High-resolution matte" : "Processed matte"
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
                    <p className="text-sm">Processed matte will appear here</p>
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
                galleryPreviewImage={processedImage}
              >
                {highResImageUrl && (
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium">
                    {highResMultiplier}x High-Res
                  </div>
                )}
              </ImageDisplayWindow>
            </div>

            {/* Bottom Row: Settings in Two Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left Column: Matte Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Matte Settings</h3>

                {/* Canvas Dimensions */}
                <div className="space-y-2">
                  <Label>Canvas Dimensions (pixels)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="canvasWidth" className="text-xs">
                        Width
                      </Label>
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
                      <Label htmlFor="canvasHeight" className="text-xs">
                        Height
                      </Label>
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
                </div>

                {/* Preset Sizes */}
                <PresetSizes
                  onSizeSelect={(width, height) => {
                    setCanvasWidth(width);
                    setCanvasHeight(height);
                  }}
                />

                {/* Padding */}
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

                {/* Matte Color */}
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
              </div>

              {/* Right Column: Processing Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Processing Settings</h3>

                {/* Cloudflare Settings */}
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
          onReplaceImage={() => handleReplaceImage()}
          onSaveToImages={() => handleUploadToCloudflare()}
          onDownloadLocal={() => handleDownload()}
          onReset={handleReset}
          onClose={handleClose}
          canProcess={!!image}
          processButtonContent={{
            idle: {
              icon: <Palette className="mr-2 h-4 w-4" />,
              text: "Create Matte",
            },
            processing: { text: "Creating Matte..." },
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
