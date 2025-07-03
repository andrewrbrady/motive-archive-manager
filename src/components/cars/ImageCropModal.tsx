import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
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
  Crop,
  Move,
  ZoomIn,
  RotateCcw,
  Play,
  Pause,
  Check,
  X,
  Maximize2,
  Scissors,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import Image from "next/image";
import { CloudflareImage } from "@/components/ui/CloudflareImage";
import { useAPI } from "@/hooks/useAPI";
import { useGalleryImageProcessing } from "@/lib/hooks/useGalleryImageProcessing";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ImageProcessingModalHeader } from "./shared/ImageProcessingModalHeader";
import { ImageProcessingModalFooter } from "./shared/ImageProcessingModalFooter";

interface ImageCropModalProps {
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

interface CropArea {
  x: number;
  y: number;
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

export function ImageCropModal({
  isOpen,
  onClose,
  image,
  enablePreview,
  galleryId,
  onImageReplaced,
}: ImageCropModalProps) {
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

  // Crop settings
  const [cropArea, setCropArea] = useState<CropArea>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [scale, setScale] = useState<number>(1.0);
  const [outputWidth, setOutputWidth] = useState<string>("1080");
  const [outputHeight, setOutputHeight] = useState<string>("1920");

  // Cloudflare settings
  const [cloudflareWidth, setCloudflareWidth] = useState<string>("3000");
  const [cloudflareQuality, setCloudflareQuality] = useState<string>("100");

  // Live preview settings
  const [livePreviewEnabled, setLivePreviewEnabled] = useState<boolean>(true);
  const [isGeneratingPreview, setIsGeneratingPreview] =
    useState<boolean>(false);
  const [livePreviewUrl, setLivePreviewUrl] = useState<string | null>(null);
  const [cachedImagePath, setCachedImagePath] = useState<string | null>(null);
  const [previewProcessingTime, setPreviewProcessingTime] = useState<
    number | null
  >(null);

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

  // Canvas refs for interactive cropping
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [canvasScale, setCanvasScale] = useState(1);

  // Debounce timer for live preview
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load live preview preference from localStorage
  useEffect(() => {
    const savedLivePreview = localStorage.getItem("imageCropLivePreview");
    if (savedLivePreview !== null) {
      setLivePreviewEnabled(savedLivePreview === "true");
    }
  }, []);

  // Save live preview preference and handle toggle
  const handleLivePreviewToggle = (enabled: boolean) => {
    setLivePreviewEnabled(enabled);
    localStorage.setItem("imageCropLivePreview", enabled.toString());

    if (!enabled) {
      setLivePreviewUrl(null);
      setPreviewProcessingTime(null);
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    }
  };

  // Helper function to initialize crop area based on output dimensions
  const initializeCropArea = useCallback(
    (
      imageDimensions: ImageDimensions,
      targetWidth: number,
      targetHeight: number
    ) => {
      const imageAspect = imageDimensions.width / imageDimensions.height;
      const targetAspect = targetWidth / targetHeight;

      let cropWidth, cropHeight;

      // Fit the target aspect ratio within the image
      if (targetAspect > imageAspect) {
        // Target is wider than image - fit to image width
        cropWidth = imageDimensions.width;
        cropHeight = Math.floor(cropWidth / targetAspect);
      } else {
        // Target is taller than image - fit to image height
        cropHeight = imageDimensions.height;
        cropWidth = Math.floor(cropHeight * targetAspect);
      }

      // Ensure crop area doesn't exceed image boundaries
      cropWidth = Math.min(cropWidth, imageDimensions.width);
      cropHeight = Math.min(cropHeight, imageDimensions.height);

      // Center the crop area
      const cropX = Math.floor((imageDimensions.width - cropWidth) / 2);
      const cropY = Math.floor((imageDimensions.height - cropHeight) / 2);

      setCropArea({
        x: cropX,
        y: cropY,
        width: cropWidth,
        height: cropHeight,
      });
    },
    []
  );

  // Validate crop area against image boundaries
  const validateCropArea = useCallback(
    (crop: CropArea, imageDims: ImageDimensions): boolean => {
      return (
        crop.x >= 0 &&
        crop.y >= 0 &&
        crop.width > 0 &&
        crop.height > 0 &&
        crop.x + crop.width <= imageDims.width &&
        crop.y + crop.height <= imageDims.height
      );
    },
    []
  );

  // Get processing image URL (higher resolution)
  const getProcessingImageUrl = useCallback(
    (baseUrl: string) => {
      if (!baseUrl.includes("imagedelivery.net")) return baseUrl;

      // First, normalize to medium variant for consistency
      const mediumUrl = getMediumVariantUrl(baseUrl);

      // Then apply high-resolution parameters
      const params = [`w=${cloudflareWidth}`, "q=100"];

      // Replace the medium variant with our processing parameters
      const urlParts = mediumUrl.split("/");
      urlParts[urlParts.length - 1] = params.join(",");
      return urlParts.join("/");
    },
    [cloudflareWidth]
  );

  // Get gallery processing URL (strips Cloudflare transforms for API calls)
  const getGalleryProcessingImageUrl = useCallback(
    (baseUrl: string): string => {
      if (!baseUrl.includes("imagedelivery.net")) {
        return baseUrl;
      }

      // For Cloudflare URLs, ensure we use the /public variant for processing
      const urlParts = baseUrl.split("/");
      const baseUrlWithoutVariant = urlParts.slice(0, -1).join("/");
      return `${baseUrlWithoutVariant}/public`;
    },
    []
  );

  // Get preview image URL (medium resolution for caching)
  const getPreviewImageUrl = useCallback((baseUrl: string) => {
    if (!baseUrl.includes("imagedelivery.net")) return baseUrl;

    // First, normalize to medium variant for consistency
    const mediumUrl = getMediumVariantUrl(baseUrl);

    // Then apply preview parameters
    const params = ["w=1500", "q=90"];

    // Replace the medium variant with our preview parameters
    const urlParts = mediumUrl.split("/");
    urlParts[urlParts.length - 1] = params.join(",");
    return urlParts.join("/");
  }, []);

  // Cache image locally for live preview - disabled for cloud-only
  const cacheImageForPreview = useCallback(async () => {
    if (!api || !image?.url) return;

    try {
      const previewImageUrl = getPreviewImageUrl(image.url);

      const requestData = {
        imageUrl: previewImageUrl,
        imageId: (image as any)._id || (image as any).id || "unknown",
      };

      const result = await api.post<{
        success?: boolean;
        cachedPath?: string;
        error?: string;
      }>("images/cache-for-preview", requestData);

      if (result.success && result.cachedPath) {
        setCachedImagePath(result.cachedPath);
      }
    } catch (error: any) {
      console.error("Failed to cache image for preview:", error);
    }
  }, [api, image?.url, getPreviewImageUrl]);

  // Generate live preview - disabled for cloud-only
  const generateLivePreview = useCallback(async () => {
    if (
      !api ||
      !livePreviewEnabled ||
      !cachedImagePath ||
      !originalDimensions ||
      cropArea.width <= 0 ||
      cropArea.height <= 0
    ) {
      return;
    }

    setIsGeneratingPreview(true);

    try {
      const requestData = {
        cachedImagePath,
        cropX: cropArea.x,
        cropY: cropArea.y,
        cropWidth: cropArea.width,
        cropHeight: cropArea.height,
        outputWidth: 400, // Fixed preview width
        outputHeight: Math.round(
          400 * (parseInt(outputHeight) / parseInt(outputWidth))
        ),
        scale: scale,
        previewImageDimensions: originalDimensions,
      };

      const result = await api.post<{
        success?: boolean;
        previewImageData?: string;
        processingTime?: number;
        error?: string;
      }>("images/live-preview", requestData);

      if (result.success && result.previewImageData) {
        // Clean up previous preview URL
        if (livePreviewUrl) {
          URL.revokeObjectURL(livePreviewUrl);
        }

        // Create data URL from base64
        const dataUrl = `data:image/jpeg;base64,${result.previewImageData}`;
        setLivePreviewUrl(dataUrl);

        if (result.processingTime) {
          setPreviewProcessingTime(result.processingTime);
        }
      } else {
        console.warn(
          "Live preview failed:",
          result.error || "No error details provided"
        );
      }
    } catch (error: any) {
      // Improve error logging to handle empty objects
      const errorMessage = error?.message || error?.error || "Unknown error";
      const errorDetails = error?.response?.data || error?.data || error;
      console.error("Failed to generate live preview:", {
        message: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsGeneratingPreview(false);
    }
  }, [
    api,
    livePreviewEnabled,
    cachedImagePath,
    originalDimensions,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    scale,
    outputWidth,
    outputHeight,
    livePreviewUrl,
  ]);

  // Debounced live preview generation
  const debouncedGeneratePreview = useCallback(() => {
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }

    previewTimeoutRef.current = setTimeout(() => {
      generateLivePreview();
    }, 300);
  }, [generateLivePreview]);

  // Helper function to check if live preview should trigger
  const shouldTriggerLivePreview = useCallback(() => {
    return (
      livePreviewEnabled &&
      cachedImagePath &&
      cropArea.width > 0 &&
      cropArea.height > 0
    );
  }, [livePreviewEnabled, cachedImagePath, cropArea]);

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
        // This handles cases where database URLs are missing /public suffix
        return `${baseUrl}/${params.join(",")}`;
      }
    }

    // Fallback for other URL formats - try to replace /public if it exists
    return baseUrl.replace(/\/public$/, `/${params.join(",")}`);
  };

  // Helper function to get consistent medium variant URL for dimension calculations
  const getMediumVariantUrl = (baseUrl: string) => {
    if (!baseUrl.includes("imagedelivery.net")) return baseUrl;

    // Always use 'medium' variant for consistent dimensions
    const urlParts = baseUrl.split("/");
    const lastPart = urlParts[urlParts.length - 1];

    // Check if the last part is a variant (alphabetic or has parameters)
    if (lastPart.match(/^[a-zA-Z]+$/) || lastPart.includes("=")) {
      // Replace with medium variant
      urlParts[urlParts.length - 1] = "medium";
    } else {
      // No variant specified, append medium
      urlParts.push("medium");
    }

    return urlParts.join("/");
  };

  // Memoize the enhanced image URL
  const enhancedImageUrl = useMemo(() => {
    if (!image?.url) return null;
    const enhanced = getEnhancedImageUrl(
      image.url,
      cloudflareWidth,
      cloudflareQuality
    );
    return enhanced;
  }, [image?.url, cloudflareWidth, cloudflareQuality]);

  // Memoize the medium variant URL for dimension calculations
  const mediumImageUrl = useMemo(() => {
    if (!image?.url) return null;
    return getMediumVariantUrl(image.url);
  }, [image?.url]);

  // Load original image dimensions
  useEffect(() => {
    if (mediumImageUrl) {
      const img = new window.Image();
      img.onload = () => {
        const dimensions = {
          width: img.naturalWidth,
          height: img.naturalHeight,
        };
        setOriginalDimensions(dimensions);

        console.log(
          `🖼️ Cars modal - Loaded dimensions from medium variant: ${dimensions.width}×${dimensions.height}`
        );

        // Check if image is large enough for the tallest preset (1920px)
        const minRequiredHeight = 1920;
        if (dimensions.height < minRequiredHeight) {
          console.warn(
            `Image height (${dimensions.height}px) is smaller than minimum required (${minRequiredHeight}px). Consider using a higher resolution image.`
          );
        }

        // Initialize crop area based on current output dimensions
        initializeCropArea(
          dimensions,
          parseInt(outputWidth),
          parseInt(outputHeight)
        );
      };
      img.onerror = (error) => {
        console.error(
          "Failed to load medium variant image for dimensions:",
          error
        );
        console.log(
          "🔄 Cars modal - Falling back to enhanced image URL for dimensions"
        );

        // Fallback to enhanced image URL if medium variant fails
        if (enhancedImageUrl) {
          img.src = enhancedImageUrl;
        }
      };
      img.src = mediumImageUrl;
    }
  }, [
    mediumImageUrl,
    enhancedImageUrl,
    outputWidth,
    outputHeight,
    initializeCropArea,
  ]);

  // Draw the crop preview on canvas
  const drawCropPreview = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !mediumImageUrl || !originalDimensions) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new window.Image();
    img.onload = () => {
      // Calculate canvas scale to fit image
      const maxCanvasWidth = 400;
      const maxCanvasHeight = 300;
      const imageAspect = originalDimensions.width / originalDimensions.height;

      let canvasWidth, canvasHeight;
      if (imageAspect > maxCanvasWidth / maxCanvasHeight) {
        canvasWidth = maxCanvasWidth;
        canvasHeight = maxCanvasWidth / imageAspect;
      } else {
        canvasHeight = maxCanvasHeight;
        canvasWidth = maxCanvasHeight * imageAspect;
      }

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      const scale = canvasWidth / originalDimensions.width;
      setCanvasScale(scale);

      // Clear canvas
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      // Draw image
      ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);

      // Draw crop overlay
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Clear crop area
      const scaledCropX = cropArea.x * scale;
      const scaledCropY = cropArea.y * scale;
      const scaledCropWidth = cropArea.width * scale;
      const scaledCropHeight = cropArea.height * scale;

      ctx.clearRect(
        scaledCropX,
        scaledCropY,
        scaledCropWidth,
        scaledCropHeight
      );
      ctx.drawImage(
        img,
        cropArea.x,
        cropArea.y,
        cropArea.width,
        cropArea.height,
        scaledCropX,
        scaledCropY,
        scaledCropWidth,
        scaledCropHeight
      );

      // Draw crop border
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        scaledCropX,
        scaledCropY,
        scaledCropWidth,
        scaledCropHeight
      );

      // Draw corner handles
      const handleSize = 8;
      ctx.fillStyle = "#3b82f6";
      const corners = [
        [scaledCropX, scaledCropY],
        [scaledCropX + scaledCropWidth, scaledCropY],
        [scaledCropX, scaledCropY + scaledCropHeight],
        [scaledCropX + scaledCropWidth, scaledCropY + scaledCropHeight],
      ];

      corners.forEach(([x, y]) => {
        ctx.fillRect(
          x - handleSize / 2,
          y - handleSize / 2,
          handleSize,
          handleSize
        );
      });
    };
    img.onerror = (error) => {
      console.error("Failed to load medium variant for canvas:", error);
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔄 Cars modal - Canvas fallback to enhanced image URL");

      // Fallback to enhanced image URL if medium variant fails
      if (enhancedImageUrl) {
        img.src = enhancedImageUrl;
      }
    };
    img.src = mediumImageUrl;
  }, [mediumImageUrl, enhancedImageUrl, originalDimensions, cropArea]);

  // Redraw canvas when crop area changes
  useEffect(() => {
    drawCropPreview();
  }, [drawCropPreview]);

  // Canvas mouse handlers for interactive cropping
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !originalDimensions) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / canvasScale;
    const y = (e.clientY - rect.top) / canvasScale;

    setIsDragging(true);
    setDragStart({ x, y });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !originalDimensions) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / canvasScale;
    const y = (e.clientY - rect.top) / canvasScale;

    const deltaX = x - dragStart.x;
    const deltaY = y - dragStart.y;

    setCropArea((prev) => {
      const newX = Math.max(
        0,
        Math.min(prev.x + deltaX, originalDimensions.width - prev.width)
      );
      const newY = Math.max(
        0,
        Math.min(prev.y + deltaY, originalDimensions.height - prev.height)
      );

      return {
        ...prev,
        x: newX,
        y: newY,
      };
    });

    setDragStart({ x, y });
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
    // Trigger live preview when mouse drag ends
    if (shouldTriggerLivePreview()) {
      debouncedGeneratePreview();
    }
  };

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

  // Cache image for live preview when modal opens - disabled for cloud-only
  useEffect(() => {
    if (isOpen && image?.url && livePreviewEnabled) {
      cacheImageForPreview();
    }
  }, [isOpen, image?.url, livePreviewEnabled, cacheImageForPreview]);

  // Auto-generate initial live preview when crop area is ready
  useEffect(() => {
    if (
      originalDimensions &&
      cropArea.width > 0 &&
      cropArea.height > 0 &&
      shouldTriggerLivePreview()
    ) {
      debouncedGeneratePreview();
    }
  }, [
    originalDimensions,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    shouldTriggerLivePreview,
  ]);

  // Trigger live preview when output dimensions change
  useEffect(() => {
    if (shouldTriggerLivePreview()) {
      debouncedGeneratePreview();
    }
  }, [outputWidth, outputHeight, scale, shouldTriggerLivePreview]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (livePreviewUrl) {
        URL.revokeObjectURL(livePreviewUrl);
      }
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, [livePreviewUrl]);

  const handleProcess = async () => {
    if (!image || !enhancedImageUrl || !api) return;

    setIsProcessing(true);
    setCloudflareResult(null);
    setRemoteServiceUsed(false);

    try {
      const requestData = {
        imageUrl: getProcessingImageUrl(image.url),
        cropX: Math.round(cropArea.x),
        cropY: Math.round(cropArea.y),
        cropWidth: Math.round(cropArea.width),
        cropHeight: Math.round(cropArea.height),
        outputWidth: parseInt(outputWidth),
        outputHeight: parseInt(outputHeight),
        scale: scale,
        uploadToCloudflare: false,
        originalFilename: image.filename,
        previewImageDimensions: originalDimensions,
      };

      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🚀 Crop API request data:", requestData);

      const result = await api.post<any>("/images/crop-image", requestData);

      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("📥 Crop API response:", result);

      if (result.success) {
        // Handle both local API (imageData) and cloud service (processedImageUrl) responses
        if (result.processedImageUrl) {
          // Cloud service returns a data URL directly
          setProcessedImageUrl(result.processedImageUrl);
        } else if (result.imageData) {
          // Local API returns base64 string, convert to blob URL for preview
          const byteCharacters = atob(result.imageData);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: "image/jpeg" });
          const blobUrl = URL.createObjectURL(blob);
          setProcessedImageUrl(blobUrl);
        }

        setRemoteServiceUsed(result.remoteServiceUsed || false);
        setProcessingStatus("Processing completed successfully!");

        toast({
          title: "Success",
          description: `Image cropped successfully using Sharp processing`,
        });
      } else {
        throw new Error(result.error || "Processing failed");
      }
    } catch (error) {
      console.error("❌ Processing error:", error);

      // Parse error response to get both error and suggestion
      let errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      let suggestion = "";

      // Check for common configuration issues
      if (errorMessage.includes("crop-image endpoint may not be available")) {
        suggestion =
          "There may be an issue with the image processing service. Please try again.";
      } else if (
        errorMessage.includes("Failed to download image: 403") ||
        errorMessage.includes("Failed to download image: Forbidden")
      ) {
        suggestion =
          "This appears to be a Cloudflare access issue. Make sure you're using a valid image URL.";
      } else if (
        errorMessage.includes("connection refused") ||
        errorMessage.includes("ECONNREFUSED")
      ) {
        suggestion =
          "Network connectivity issue. Check your internet connection.";
      } else if (errorMessage.includes("getaddrinfo ENOTFOUND")) {
        suggestion =
          "Network connectivity issue. Check your internet connection.";
      }

      setError(errorMessage);

      toast({
        title: "Processing Failed",
        description: suggestion
          ? `${errorMessage}\n\n💡 ${suggestion}`
          : errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleHighResProcess = async (multiplier: 2 | 4) => {
    if (!processedImageUrl || !image) {
      toast({
        title: "Error",
        description: "Please process the image first",
        variant: "destructive",
      });
      return;
    }

    if (!api) {
      toast({
        title: "Authentication Required",
        description: "Please log in to process high-resolution images.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingHighRes(true);
    setHighResMultiplier(multiplier);
    setProcessingStatus(`Generating ${multiplier}x high-resolution version...`);

    try {
      const result = await api.post<any>("/images/crop-image", {
        imageUrl: getProcessingImageUrl(image.url || ""),
        cropX: cropArea.x,
        cropY: cropArea.y,
        cropWidth: cropArea.width,
        cropHeight: cropArea.height,
        outputWidth: parseInt(outputWidth) * multiplier,
        outputHeight: parseInt(outputHeight) * multiplier,
        scale: scale * multiplier,
        uploadToCloudflare: false,
        originalFilename: image?.filename,
        originalCarId: image?.carId,
        previewImageDimensions: originalDimensions,
      });

      if (result.success) {
        // Handle both local API (imageData) and cloud service (processedImageUrl) responses
        if (result.processedImageUrl) {
          // Cloud service returns a data URL directly
          setHighResImageUrl(result.processedImageUrl);
        } else if (result.imageData) {
          // Local API returns base64 string, convert to blob URL for preview
          const byteCharacters = atob(result.imageData);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: "image/jpeg" });
          const blobUrl = URL.createObjectURL(blob);
          setHighResImageUrl(blobUrl);
        }

        setProcessingStatus(
          `${multiplier}x high-resolution version completed!`
        );

        toast({
          title: "Success",
          description: `${multiplier}x high-resolution image generated successfully`,
        });
      } else {
        throw new Error(result.error || "High-res processing failed");
      }
    } catch (error) {
      console.error("High-res processing error:", error);

      let errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      let suggestion = "";

      if (errorMessage.includes("crop-image endpoint may not be available")) {
        suggestion =
          "Try switching to 'Local Processing' in the settings below.";
      }

      setError(errorMessage);

      toast({
        title: "High-res Processing Failed",
        description: suggestion
          ? `${errorMessage}\n\n💡 ${suggestion}`
          : errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessingHighRes(false);
      setHighResMultiplier(null);
    }
  };

  const handleUploadToCloudflare = async () => {
    const imageUrlToUpload = highResImageUrl || processedImageUrl;

    if (!imageUrlToUpload || !image || !enhancedImageUrl) {
      toast({
        title: "Error",
        description: "No processed image to upload",
        variant: "destructive",
      });
      return;
    }

    if (!api) {
      toast({
        title: "Authentication Required",
        description: "Please log in to upload images to Cloudflare.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setProcessingStatus("Uploading to Cloudflare...");

    try {
      // Use the higher resolution parameters if high-res image exists
      const isHighRes = !!highResImageUrl;
      const multiplier = isHighRes ? highResMultiplier || 2 : 1;

      const result = await api.post<any>("/images/crop-image", {
        imageUrl: getProcessingImageUrl(image?.url || ""),
        cropX: cropArea.x,
        cropY: cropArea.y,
        cropWidth: cropArea.width,
        cropHeight: cropArea.height,
        outputWidth: parseInt(outputWidth) * multiplier,
        outputHeight: parseInt(outputHeight) * multiplier,
        scale: scale * multiplier,
        uploadToCloudflare: true,
        originalFilename: image?.filename,
        originalCarId: image?.carId,
        previewImageDimensions: originalDimensions,
      });

      if (result.success && result.cloudflareUpload?.success) {
        setCloudflareResult(result.cloudflareUpload);
        setProcessingStatus("Upload completed successfully!");

        toast({
          title: "Success",
          description: "Image uploaded to Cloudflare successfully",
        });
      } else {
        throw new Error(
          result.cloudflareUpload?.error || result.error || "Upload failed"
        );
      }
    } catch (error) {
      console.error("Upload error:", error);

      // Parse error response to get both error and suggestion
      let errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      let suggestion = "";

      // Check if this is a cloud processing failure with suggestion
      if (errorMessage.includes("crop-image endpoint may not be available")) {
        suggestion =
          "Try switching to 'Local Processing' in the settings below.";
      }

      setError(errorMessage);

      toast({
        title: "Upload Failed",
        description: suggestion
          ? `${errorMessage}\n\n💡 ${suggestion}`
          : errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = () => {
    if (!processedImageUrl) return;

    const link = document.createElement("a");
    link.href = processedImageUrl;
    link.download = `cropped_${image?.filename || "image"}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleHighResDownload = () => {
    if (!highResImageUrl) return;

    const link = document.createElement("a");
    link.href = highResImageUrl;
    link.download = `cropped_highres_${image?.filename || "image"}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewInGallery = () => {
    if (cloudflareResult?.imageUrl) {
      window.open(cloudflareResult.imageUrl, "_blank");
    }
  };

  const handleReset = () => {
    setCropArea({ x: 0, y: 0, width: 0, height: 0 });
    setScale(1.0);
    setOutputWidth("1080");
    setOutputHeight("1920");
    setProcessedImageUrl(null);
    setHighResImageUrl(null);
    setCloudflareResult(null);
    setProcessingStatus("");
    setError(null);
    setRemoteServiceUsed(false);
    // Reset gallery preview workflow state
    setProcessedImage(null);
    setShowPreview(false);

    // Reinitialize crop area if we have dimensions
    if (originalDimensions) {
      const cropWidth = Math.floor(originalDimensions.width * 0.5);
      const cropHeight = Math.floor(originalDimensions.height * 0.5);
      setCropArea({
        x: Math.floor((originalDimensions.width - cropWidth) / 2),
        y: Math.floor((originalDimensions.height - cropHeight) / 2),
        width: cropWidth,
        height: cropHeight,
      });
    }
  };

  const handleClose = () => {
    handleReset();
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

    console.log("🖼️ Image Crop processing starting:", {
      originalUrl: image.url,
      enhancedUrl: enhancedImageUrl.substring(0, 100) + "...",
      processingUrl: processingImageUrl,
      cropArea,
      outputDimensions: {
        width: parseInt(outputWidth),
        height: parseInt(outputHeight),
      },
    });

    const parameters = {
      imageUrl: processingImageUrl,
      cropX: cropArea.x,
      cropY: cropArea.y,
      cropWidth: cropArea.width,
      cropHeight: cropArea.height,
      outputWidth: parseInt(outputWidth),
      outputHeight: parseInt(outputHeight),
      scale,
    };

    try {
      const result = await previewProcessImage({
        galleryId,
        imageId: image._id,
        processingType: "image-crop",
        parameters,
      });

      if (result && result.success) {
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("✅ Image Crop processing completed successfully");
        setProcessedImage(result.processedImage);
        setShowPreview(true);
      } else {
        console.error("❌ Image Crop processing failed:", {
          hasResult: !!result,
          success: result?.success,
          result: result,
          message: result
            ? "Processing returned false success"
            : "No result returned",
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to process image";
      console.error("Image Crop processing error:", errorMessage);

      toast({
        title: "Processing Failed",
        description: errorMessage,
        variant: "destructive",
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

    console.log("🔄 Image Crop replacement starting:", {
      originalUrl: image.url,
      processingUrl: processingImageUrl,
    });

    const parameters = {
      imageUrl: processingImageUrl,
      cropX: cropArea.x,
      cropY: cropArea.y,
      cropWidth: cropArea.width,
      cropHeight: cropArea.height,
      outputWidth: parseInt(outputWidth),
      outputHeight: parseInt(outputHeight),
      scale,
    };

    try {
      const result = await replaceImageInGallery(
        galleryId,
        image._id,
        "image-crop",
        parameters
      );

      if (result && result.success && onImageReplaced) {
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("✅ Image Crop replacement completed successfully");
        onImageReplaced(result.originalImageId, result.processedImage);
        handleClose();
      } else {
        console.error("❌ Image Crop replacement failed:", {
          hasResult: !!result,
          success: result?.success,
          hasCallback: !!onImageReplaced,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to replace image";
      console.error("Image Crop replacement error:", errorMessage);

      toast({
        title: "Replacement Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleDiscardPreview = () => {
    setProcessedImage(null);
    setShowPreview(false);
  };

  const handleDownloadLocal = async (scale: number = 1) => {
    console.log(
      "🚨🚨🚨 ImageCropModal.handleDownloadLocal CALLED 🚨🚨🚨",
      scale
    );
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔍 Current cropArea state:", cropArea);
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔍 Original dimensions:", originalDimensions);
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔍 Output dimensions:", { outputWidth, outputHeight });
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔍 Scale factor:", scale);

    if (
      !image ||
      !originalDimensions ||
      !validateCropArea(cropArea, originalDimensions)
    ) {
      console.log("❌ Validation failed:", {
        hasImage: !!image,
        hasOriginalDimensions: !!originalDimensions,
        cropAreaValid: validateCropArea(
          cropArea,
          originalDimensions || { width: 0, height: 0 }
        ),
        cropArea,
      });
      toast({
        title: "Error",
        description: "Valid crop area required to download image",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProcessingStatus(`Generating ${scale}x download...`);

    try {
      const processingImageUrl = getProcessingImageUrl(image.url || "");

      // Prepare crop coordinates for processing
      let scaledCropX = Math.round(cropArea.x);
      let scaledCropY = Math.round(cropArea.y);
      let scaledCropWidth = Math.round(cropArea.width);
      let scaledCropHeight = Math.round(cropArea.height);

      console.log(
        "🔍 ImageCropModal - Debug crop coordinates for scale:",
        scale,
        {
          originalCropArea: cropArea,
          originalDimensions,
          cloudflareWidth,
          processingImageUrl,
          scale,
          enhancedImageUrl,
        }
      );

      // For 2x+ processing, coordinates may need scaling depending on the backend expectations
      if (scale >= 2 && originalDimensions) {
        // The crop coordinates are currently in the enhanced image space (cloudflareWidth dimensions)
        // Check if the processing URL uses the same dimensions as the preview URL

        console.log("🔍 ImageCropModal - High-res processing debug:", {
          scale,
          originalDimensions: originalDimensions,
          cloudflareWidth: cloudflareWidth,
          cropCoordinates: {
            x: cropArea.x,
            y: cropArea.y,
            width: cropArea.width,
            height: cropArea.height,
          },
          "coordinates as percentage of image": {
            x: ((cropArea.x / originalDimensions.width) * 100).toFixed(2) + "%",
            y:
              ((cropArea.y / originalDimensions.height) * 100).toFixed(2) + "%",
            width:
              ((cropArea.width / originalDimensions.width) * 100).toFixed(2) +
              "%",
            height:
              ((cropArea.height / originalDimensions.height) * 100).toFixed(2) +
              "%",
          },
        });

        // For now, use coordinates as-is and let backend handle any necessary scaling
        // This assumes that the processingImageUrl and preview use the same dimensions
      }

      console.log("🔍 ImageCropModal - Final coordinates for API:", {
        scaledCropX,
        scaledCropY,
        scaledCropWidth,
        scaledCropHeight,
        scale,
      });

      const payload = {
        imageUrl: processingImageUrl,
        cropX: scaledCropX,
        cropY: scaledCropY,
        cropWidth: scaledCropWidth,
        cropHeight: scaledCropHeight,
        outputWidth: parseInt(outputWidth) * scale,
        outputHeight: parseInt(outputHeight) * scale,
        scale: scale * parseFloat(String(scale)),
        uploadToCloudflare: false,
        sourceImageWidth: scale >= 2 ? parseInt(cloudflareWidth) : undefined, // Use cloudflareWidth for source
      };

      console.log("🚨🚨🚨 ImageCropModal - SENDING API REQUEST 🚨🚨🚨", {
        endpoint: "/api/images/crop-image",
        method: "POST",
        payload: payload,
      });

      const response = await fetch("/api/images/crop-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Processing failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.imageData) {
        // Create download link
        const link = document.createElement("a");
        link.href = `data:image/jpeg;base64,${result.imageData}`;
        link.download = `${image.filename || "cropped"}_${scale}x.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
          title: "Success",
          description: `${scale}x image downloaded successfully`,
        });
      } else {
        throw new Error("No image data received");
      }

      setProcessingStatus("Download completed");
    } catch (error: any) {
      const errorMessage = error?.message || "Download failed";
      setError(errorMessage);

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Get the current enhanced image URL for display
  const currentImageUrl = enhancedImageUrl;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[85vh] mx-4 overflow-hidden flex flex-col">
        <ImageProcessingModalHeader
          icon={<Crop className="h-5 w-5" />}
          title="Image Crop Tool"
          description="Crop and scale your image for social media formats. Drag the crop area on the preview to adjust."
          image={image}
          processingStatus={processingStatus}
          error={error}
          cloudflareResult={cloudflareResult}
        />

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4 p-1">
            {/* Top Row: Image Preview and Live Preview Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left: Image Preview with Crop Overlay */}
              <div className="space-y-2">
                <Label>Image Preview & Crop Area</Label>
                <div className="border rounded-lg p-4 bg-muted/50">
                  {currentImageUrl ? (
                    <div className="space-y-2">
                      <canvas
                        ref={canvasRef}
                        className="border rounded cursor-move max-w-full"
                        onMouseDown={handleCanvasMouseDown}
                        onMouseMove={handleCanvasMouseMove}
                        onMouseUp={handleCanvasMouseUp}
                        onMouseLeave={handleCanvasMouseUp}
                      />
                      <p className="text-xs text-muted-foreground">
                        Drag to move the crop area. Original:{" "}
                        {originalDimensions?.width}×{originalDimensions?.height}
                      </p>
                    </div>
                  ) : (
                    <div className="h-40 lg:h-48 flex items-center justify-center text-muted-foreground">
                      No image selected
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Live Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Live Preview</Label>
                  {livePreviewEnabled && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleLivePreviewToggle(!livePreviewEnabled)
                      }
                      className="h-8 px-3"
                    >
                      {livePreviewEnabled ? (
                        <>
                          <Pause className="mr-1 h-3 w-3" />
                          Disable
                        </>
                      ) : (
                        <>
                          <Play className="mr-1 h-3 w-3" />
                          Enable
                        </>
                      )}
                    </Button>
                  )}
                </div>

                <div className="border rounded-lg p-4 bg-muted/50 relative">
                  {livePreviewEnabled && livePreviewUrl ? (
                    <div className="space-y-2">
                      <Image
                        src={livePreviewUrl}
                        alt="Live preview"
                        width={400}
                        height={400}
                        className="w-full h-auto max-h-40 lg:max-h-48 object-contain rounded border"
                        unoptimized={true}
                      />
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          Live Preview (400px wide)
                        </p>
                        {previewProcessingTime && (
                          <p className="text-xs text-muted-foreground">
                            {previewProcessingTime}ms
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="h-40 lg:h-48 flex items-center justify-center text-muted-foreground">
                      <div className="text-center space-y-2">
                        <Eye className="h-8 w-8 mx-auto opacity-50" />
                        <p className="text-sm">Live preview disabled</p>
                      </div>
                    </div>
                  )}

                  {/* Generating indicator - absolutely positioned */}
                  {isGeneratingPreview && (
                    <div className="absolute bottom-2 right-2">
                      <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Row: Settings in Two Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left Column: Crop Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Crop Settings</h3>

                {/* Crop Area Controls */}
                <div className="space-y-4">
                  <Label>Crop Area (pixels)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="cropX" className="text-xs">
                        X Position
                      </Label>
                      <Input
                        id="cropX"
                        type="number"
                        value={cropArea.x}
                        onChange={(e) => {
                          const newX = parseInt(e.target.value) || 0;
                          if (
                            originalDimensions &&
                            newX + cropArea.width <= originalDimensions.width
                          ) {
                            setCropArea((prev) => ({
                              ...prev,
                              x: Math.max(0, newX),
                            }));
                          }
                        }}
                        min="0"
                        max={originalDimensions?.width || 0}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cropY" className="text-xs">
                        Y Position
                      </Label>
                      <Input
                        id="cropY"
                        type="number"
                        value={cropArea.y}
                        onChange={(e) => {
                          const newY = parseInt(e.target.value) || 0;
                          if (
                            originalDimensions &&
                            newY + cropArea.height <= originalDimensions.height
                          ) {
                            setCropArea((prev) => ({
                              ...prev,
                              y: Math.max(0, newY),
                            }));
                          }
                        }}
                        min="0"
                        max={originalDimensions?.height || 0}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cropWidth" className="text-xs">
                        Width
                      </Label>
                      <Input
                        id="cropWidth"
                        type="number"
                        value={cropArea.width}
                        onChange={(e) => {
                          const newWidth = parseInt(e.target.value) || 0;
                          if (
                            originalDimensions &&
                            cropArea.x + newWidth <= originalDimensions.width
                          ) {
                            setCropArea((prev) => ({
                              ...prev,
                              width: Math.max(1, newWidth),
                            }));
                          }
                        }}
                        min="1"
                        max={originalDimensions?.width || 0}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cropHeight" className="text-xs">
                        Height
                      </Label>
                      <Input
                        id="cropHeight"
                        type="number"
                        value={cropArea.height}
                        onChange={(e) => {
                          const newHeight = parseInt(e.target.value) || 0;
                          if (
                            originalDimensions &&
                            cropArea.y + newHeight <= originalDimensions.height
                          ) {
                            setCropArea((prev) => ({
                              ...prev,
                              height: Math.max(1, newHeight),
                            }));
                          }
                        }}
                        min="1"
                        max={originalDimensions?.height || 0}
                      />
                    </div>
                  </div>
                </div>

                {/* Crop Area Validation Status */}
                {originalDimensions && (
                  <div className="space-y-2">
                    <div
                      className={`p-2 rounded-lg text-sm ${
                        validateCropArea(cropArea, originalDimensions)
                          ? "bg-gray-50 text-gray-700 border border-gray-200"
                          : "bg-gray-100 text-gray-800 border border-gray-300"
                      }`}
                    >
                      {validateCropArea(cropArea, originalDimensions) ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Crop area is valid
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4" />
                          Crop area exceeds image boundaries
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Scale Control */}
                <div className="space-y-2">
                  <Label>Scale Factor: {scale.toFixed(2)}x</Label>
                  <Slider
                    value={[scale]}
                    onValueChange={(value) => {
                      setScale(value[0]);
                    }}
                    min={0.1}
                    max={3.0}
                    step={0.1}
                    className="w-full"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setScale(0.5);
                      }}
                    >
                      0.5x
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setScale(1.0);
                      }}
                    >
                      1.0x
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setScale(1.5);
                      }}
                    >
                      1.5x
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setScale(2.0);
                      }}
                    >
                      2.0x
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right Column: Output Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Output Settings</h3>

                {/* Output Dimensions */}
                <div className="space-y-4">
                  <Label>Output Dimensions</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="outputWidth">Width (px)</Label>
                      <Input
                        id="outputWidth"
                        type="number"
                        value={outputWidth}
                        onChange={(e) => {
                          setOutputWidth(e.target.value);
                        }}
                        placeholder="1080"
                        min="100"
                        max="5000"
                      />
                    </div>
                    <div>
                      <Label htmlFor="outputHeight">Height (px)</Label>
                      <Input
                        id="outputHeight"
                        type="number"
                        value={outputHeight}
                        onChange={(e) => {
                          setOutputHeight(e.target.value);
                        }}
                        placeholder="1920"
                        min="100"
                        max="5000"
                      />
                    </div>
                  </div>

                  {/* Aspect Ratio Presets */}
                  <div className="space-y-2">
                    <Label>Aspect Ratio Presets</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setOutputWidth("1080");
                          setOutputHeight("1920");
                          if (originalDimensions) {
                            initializeCropArea(originalDimensions, 1080, 1920);
                          }
                        }}
                      >
                        9:16 (1080×1920)
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setOutputWidth("1080");
                          setOutputHeight("1080");
                          if (originalDimensions) {
                            initializeCropArea(originalDimensions, 1080, 1080);
                          }
                        }}
                      >
                        1:1 (1080×1080)
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setOutputWidth("1920");
                          setOutputHeight("1080");
                          if (originalDimensions) {
                            initializeCropArea(originalDimensions, 1920, 1080);
                          }
                        }}
                      >
                        16:9 (1920×1080)
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setOutputWidth("1080");
                          setOutputHeight("1350");
                          if (originalDimensions) {
                            initializeCropArea(originalDimensions, 1080, 1350);
                          }
                        }}
                      >
                        4:5 (1080×1350)
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Cloudflare Settings */}
                <div className="space-y-4">
                  <Label>Cloudflare Image Settings</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="cloudflareWidth">Preview Width</Label>
                      <Input
                        id="cloudflareWidth"
                        type="number"
                        value={cloudflareWidth}
                        onChange={(e) => setCloudflareWidth(e.target.value)}
                        placeholder="3000"
                        min="100"
                        max="5000"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cloudflareQuality">Quality (%)</Label>
                      <Input
                        id="cloudflareQuality"
                        type="number"
                        value={cloudflareQuality}
                        onChange={(e) => setCloudflareQuality(e.target.value)}
                        placeholder="100"
                        min="1"
                        max="100"
                      />
                    </div>
                  </div>
                </div>

                {/* Processing Status */}
                {(processingStatus || error) && (
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <div className="p-3 rounded-lg bg-muted">
                      {error ? (
                        <div className="flex items-center gap-2 text-destructive">
                          <XCircle className="h-4 w-4" />
                          <span className="text-sm">{error}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          {isProcessing ||
                          isProcessingHighRes ||
                          isUploading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                          <span className="text-sm">{processingStatus}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Processed Image Preview */}
                {processedImageUrl && (
                  <div className="space-y-2">
                    <Label>Processed Image</Label>
                    <div className="border rounded-lg p-2 bg-muted/50">
                      <Image
                        src={processedImageUrl}
                        alt="Processed image"
                        width={200}
                        height={200}
                        className="w-full h-auto max-h-32 object-contain rounded"
                        unoptimized={true}
                      />
                      {processedDimensions && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {processedDimensions.width}×
                          {processedDimensions.height}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* High-res Image Preview */}
                {highResImageUrl && (
                  <div className="space-y-2">
                    <Label>High-Resolution Image</Label>
                    <div className="border rounded-lg p-2 bg-muted/50">
                      <Image
                        src={highResImageUrl}
                        alt="High-res processed image"
                        width={200}
                        height={200}
                        className="w-full h-auto max-h-32 object-contain rounded"
                        unoptimized={true}
                      />
                      {highResDimensions && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {highResDimensions.width}×{highResDimensions.height}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Upload Result */}
                {cloudflareResult && (
                  <div className="space-y-2">
                    <Label>Upload Result</Label>
                    <div className="p-2 rounded-lg bg-gray-50 border border-gray-200">
                      <div className="flex items-center gap-2 text-gray-700">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          Upload Successful
                        </span>
                      </div>
                      {cloudflareResult.filename && (
                        <p className="text-xs text-gray-600 mt-1">
                          Filename: {cloudflareResult.filename}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Gallery Preview Result */}
                {enablePreview &&
                  galleryId &&
                  processedImage &&
                  showPreview && (
                    <div className="space-y-2">
                      <Label>Gallery Preview</Label>
                      <div className="border rounded-lg p-2 bg-blue-50 border-blue-200">
                        <Image
                          src={processedImage.url}
                          alt="Gallery processed image"
                          width={200}
                          height={200}
                          className="w-full h-auto max-h-32 object-contain rounded"
                          unoptimized={true}
                        />
                        <div className="mt-2 space-y-1">
                          <p className="text-xs text-blue-700 font-medium">
                            Ready to replace in gallery
                          </p>
                          <p className="text-xs text-blue-600">
                            Filename: {processedImage.filename}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>

        <ImageProcessingModalFooter
          enablePreview={enablePreview}
          galleryId={galleryId}
          showPreview={showPreview}
          processedImage={processedImage}
          isGalleryProcessing={false}
          isReplacing={false}
          isProcessing={isProcessing}
          isProcessingHighRes={isProcessingHighRes}
          highResMultiplier={highResMultiplier}
          isUploading={isUploading}
          processedImageUrl={processedImageUrl}
          highResImageUrl={highResImageUrl}
          cloudflareResult={cloudflareResult}
          onReplaceImage={handleReplaceImage}
          onSaveToImages={handleUploadToCloudflare}
          onDownloadLocal={handleDownloadLocal}
          onReset={handleReset}
          onClose={handleClose}
          canProcess={
            !!image &&
            !!originalDimensions &&
            validateCropArea(cropArea, originalDimensions)
          }
          processButtonContent={{
            idle: {
              icon: <Crop className="mr-2 h-4 w-4" />,
              text: "Crop Image",
            },
            processing: { text: "Processing..." },
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
