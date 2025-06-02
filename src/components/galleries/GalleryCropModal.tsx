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
  CheckCircle,
  XCircle,
  Settings,
  Cloud,
  Monitor,
  Crop,
  ZoomIn,
  Play,
  Pause,
  Check,
  X,
  Upload,
  Maximize2,
  Scissors,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { CloudflareImage } from "@/components/ui/CloudflareImage";
import { useGalleryImageProcessing } from "@/lib/hooks/useGalleryImageProcessing";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAPI } from "@/hooks/useAPI";
import { toast as hotToast } from "react-hot-toast";
import Image from "next/image";

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageDimensions {
  width: number;
  height: number;
}

interface GalleryCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: ImageData | null;
  galleryId: string;
  onImageProcessed?: (originalImageId: string, newImageData: any) => void;
}

interface CacheImageData {
  imageUrl: string;
}

interface CacheImageResponse {
  success?: boolean;
  cachedPath?: string;
  error?: string;
}

interface LivePreviewData {
  cachedImagePath: string;
  cropArea: CropArea;
  outputWidth: number;
  outputHeight: number;
  scale: number;
}

interface LivePreviewResponse {
  success?: boolean;
  previewImageData?: string;
  processingTime?: number;
  error?: string;
}

interface CropImageData {
  imageUrl?: string;
  cachedImagePath?: string;
  cropArea?: CropArea;
  outputWidth: number;
  outputHeight: number;
  scale: number;
  uploadToCloudflare: boolean;
  originalFilename: string;
  scaleMultiplier?: number;
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
  previewImageDimensions?: ImageDimensions | null;
}

interface CropImageResponse {
  success?: boolean;
  processedImageUrl?: string;
  processingTime?: number;
  remoteServiceUsed?: boolean;
  error?: string;
  imageData?: string;
}

interface ReplaceImageDirectData {
  originalImageId: string;
  processedImageId: string;
}

interface ReplaceImageDirectResponse {
  success?: boolean;
  originalImageId?: string;
  processedImage?: {
    _id: string;
    url: string;
    filename: string;
    metadata?: any;
    carId?: string;
  };
  error?: string;
}

export function GalleryCropModal({
  isOpen,
  onClose,
  image,
  galleryId,
  onImageProcessed,
}: GalleryCropModalProps) {
  const api = useAPI();
  const {
    previewProcessImage,
    replaceImageInGallery,
    isProcessing: isGalleryProcessing,
    isReplacing: isGalleryReplacing,
  } = useGalleryImageProcessing();

  // State management
  const [cropArea, setCropArea] = useState<CropArea>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [scale, setScale] = useState<number>(1.0);
  const [outputWidth, setOutputWidth] = useState<string>("1080");
  const [outputHeight, setOutputHeight] = useState<string>("1080");
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

  // Processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  const [isProcessingHighRes, setIsProcessingHighRes] = useState(false);
  const [isReplacing1x, setIsReplacing1x] = useState(false);
  const [isReplacing2x, setIsReplacing2x] = useState(false);
  const [isWaitingForImage, setIsWaitingForImage] = useState(false);
  const [highResMultiplier, setHighResMultiplier] = useState<2 | 4 | null>(
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

  // Status and errors
  const [error, setError] = useState<string | null>(null);
  const [remoteServiceUsed, setRemoteServiceUsed] = useState<boolean>(false);
  const [lastProcessingTime, setLastProcessingTime] = useState(0);

  // Canvas refs for interactive cropping
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [canvasScale, setCanvasScale] = useState(1);

  // Debounce timer for live preview
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load processing method preference from localStorage
  useEffect(() => {
    if (!api) return; // Add conditional check inside async function
    const savedMethod = localStorage.getItem("galleryCropMethod");
    if (savedMethod && (savedMethod === "cloud" || savedMethod === "local")) {
    }

    // Load live preview preference
    const savedLivePreview = localStorage.getItem("galleryCropLivePreview");
    if (savedLivePreview !== null) {
      setLivePreviewEnabled(savedLivePreview === "true");
    }
  }, [api]);

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
        cropWidth = imageDimensions.width;
        cropHeight = Math.floor(cropWidth / targetAspect);
      } else {
        cropHeight = imageDimensions.height;
        cropWidth = Math.floor(cropHeight * targetAspect);
      }

      // Ensure crop area doesn't exceed image boundaries
      cropWidth = Math.min(cropWidth, imageDimensions.width);
      cropHeight = Math.min(cropHeight, imageDimensions.height);

      // Center the crop area
      const cropX = Math.floor((imageDimensions.width - cropWidth) / 2);
      const cropY = Math.floor((imageDimensions.height - cropHeight) / 2);

      const newCropArea = {
        x: cropX,
        y: cropY,
        width: cropWidth,
        height: cropHeight,
      };

      setCropArea(newCropArea);
    },
    [cropArea]
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
  const getProcessingImageUrl = useCallback((baseUrl: string) => {
    if (!baseUrl.includes("imagedelivery.net")) return baseUrl;

    const params = ["w=3000", "q=100"];

    // Handle different Cloudflare URL formats
    // Format: https://imagedelivery.net/account/image-id/public
    // Should become: https://imagedelivery.net/account/image-id/w=3000,q=100
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
  }, []);

  // Get preview image URL (medium resolution for caching)
  const getPreviewImageUrl = useCallback((baseUrl: string) => {
    if (!baseUrl.includes("imagedelivery.net")) return baseUrl;

    const params = ["w=1500", "q=90"];

    // Handle different Cloudflare URL formats
    // Format: https://imagedelivery.net/account/image-id/public
    // Should become: https://imagedelivery.net/account/image-id/w=1500,q=90
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
  }, []);

  // Cache image locally for live preview
  const cacheImageForPreview = useCallback(async () => {
    if (!api) return; // Add conditional check inside async function
    if (!image?.url) return;

    try {
      const previewImageUrl = getPreviewImageUrl(image.url);

      const requestData: CacheImageData = {
        imageUrl: previewImageUrl,
      };

      const result = await api.post<CacheImageResponse>(
        "images/cache-for-preview",
        requestData
      );

      if (result.success && result.cachedPath) {
        setCachedImagePath(result.cachedPath);
      }
    } catch (error: any) {
      console.error("Failed to cache image for preview:", error);
      hotToast.error("Failed to cache image for preview");
    }
  }, [api, image?.url, getPreviewImageUrl]);

  // Generate live preview using C++ executable
  const generateLivePreview = useCallback(async () => {
    if (!api) return; // Add conditional check inside async function
    if (!livePreviewEnabled || !cachedImagePath || !originalDimensions) {
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
        outputWidth: 400,
        outputHeight: Math.round(
          400 * (parseInt(outputHeight) / parseInt(outputWidth))
        ),
        scale: scale,
        previewImageDimensions: originalDimensions,
      };

      const result = await api.post<LivePreviewResponse>(
        "images/live-preview",
        requestData
      );

      if (result.success && result.previewImageData) {
        if (livePreviewUrl) {
          URL.revokeObjectURL(livePreviewUrl);
        }

        // Create data URL from base64
        const dataUrl = `data:image/jpeg;base64,${result.previewImageData}`;
        setLivePreviewUrl(dataUrl);
        if (result.processingTime) {
          setPreviewProcessingTime(result.processingTime);
        }
      }
    } catch (error: any) {
      console.error("Failed to generate live preview:", error);
      hotToast.error("Failed to generate live preview");
    } finally {
      setIsGeneratingPreview(false);
    }
  }, [
    api,
    livePreviewEnabled,
    cachedImagePath,
    originalDimensions,
    cropArea,
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
    return livePreviewEnabled && cachedImagePath;
  }, [livePreviewEnabled, cachedImagePath]);

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

    return baseUrl;
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

  // Load original image dimensions
  useEffect(() => {
    if (!api) return; // Add conditional check inside async function
    if (enhancedImageUrl && !originalDimensions) {
      const img = new window.Image();
      img.onload = () => {
        const dimensions = {
          width: img.naturalWidth,
          height: img.naturalHeight,
        };
        setOriginalDimensions(dimensions);

        // Check if image is large enough for the tallest preset (1920px)
        const minRequiredHeight = 1920;
        if (dimensions.height < minRequiredHeight) {
          console.warn(
            `Image height (${dimensions.height}px) is smaller than minimum required (${minRequiredHeight}px). Consider using a higher resolution image.`
          );
        }

        // Only initialize crop area on first load when dimensions are loaded
        initializeCropArea(
          dimensions,
          parseInt(outputWidth),
          parseInt(outputHeight)
        );
      };
      img.src = enhancedImageUrl;
    }
  }, [
    enhancedImageUrl,
    originalDimensions,
    initializeCropArea,
    api,
    outputWidth,
    outputHeight,
  ]);

  // Cache image for live preview when modal opens
  useEffect(() => {
    if (!api) return; // Add conditional check inside async function
    if (isOpen && image?.url) {
      cacheImageForPreview();
    }
  }, [isOpen, image?.url, cacheImageForPreview, api]);

  // Auto-generate initial live preview when crop area is ready
  useEffect(() => {
    if (!api) return; // Add conditional check inside async function
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
    cropArea,
    shouldTriggerLivePreview,
    debouncedGeneratePreview,
    api,
  ]);

  // Load processed image dimensions when processed image changes
  useEffect(() => {
    if (!api) return; // Add conditional check inside async function
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
  }, [processedImageUrl, api]);

  // Load high-res image dimensions when high-res image changes
  useEffect(() => {
    if (!api) return; // Add conditional check inside async function
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
  }, [highResImageUrl, api]);

  // Draw the crop preview on canvas
  const drawCropPreview = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !enhancedImageUrl || !originalDimensions) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const img = new window.Image();
    img.onload = () => {
      // Calculate canvas scale to fit the responsive container
      const maxCanvasWidth = 350; // Reduced from 400 to fit better
      const maxCanvasHeight = 200; // Reduced from 300 to match h-32 lg:h-48
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

      const canvasScaleFactor = canvasWidth / originalDimensions.width;
      setCanvasScale(canvasScaleFactor);

      // Clear canvas
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      // Draw image
      ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);

      // Draw crop overlay
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Clear crop area
      const scaledCropX = cropArea.x * canvasScaleFactor;
      const scaledCropY = cropArea.y * canvasScaleFactor;
      const scaledCropWidth = cropArea.width * canvasScaleFactor;
      const scaledCropHeight = cropArea.height * canvasScaleFactor;

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
    img.src = enhancedImageUrl;
  }, [enhancedImageUrl, originalDimensions, cropArea, canvasScale]);

  // Update canvas when crop area or enhanced image changes
  useEffect(() => {
    if (!api) return;
    drawCropPreview();
  }, [drawCropPreview, api]);

  // Authentication guard - moved after all hooks
  if (!api) {
    return null;
  }

  // Save live preview preference and handle toggle
  const handleLivePreviewToggle = (enabled: boolean) => {
    setLivePreviewEnabled(enabled);
    if (enabled && shouldTriggerLivePreview()) {
      debouncedGeneratePreview();
    }
  };

  const handlePreset = (width: number, height: number) => {
    setOutputWidth(width.toString());
    setOutputHeight(height.toString());

    // Immediately initialize crop area for the new dimensions
    if (originalDimensions) {
      initializeCropArea(originalDimensions, width, height);
    }

    if (shouldTriggerLivePreview()) {
      debouncedGeneratePreview();
    }
  };

  // Get the current enhanced image URL for display
  const currentImageUrl = enhancedImageUrl;

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

    // Trigger live preview only after drag is complete
    if (shouldTriggerLivePreview()) {
      debouncedGeneratePreview();
    }
  };

  const handleProcess = async () => {
    if (!api) return;
    if (!image || !enhancedImageUrl || !originalDimensions) {
      toast({
        title: "Error",
        description: "No image selected for processing",
        variant: "destructive",
      });
      return;
    }

    // Validate crop area
    if (!validateCropArea(cropArea, originalDimensions)) {
      toast({
        title: "Error",
        description:
          "Crop area exceeds image boundaries. Please adjust the crop area.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const processingImageUrl = getProcessingImageUrl(image.url || "");

      console.log("✂️ Crop processing starting:", {
        originalUrl: image.url,
        processingUrl: processingImageUrl,
        urlTransformation: {
          from: image.url,
          to: processingImageUrl,
          isCloudflare: image.url.includes("imagedelivery.net"),
        },
        parameters: {
          cropArea,
          outputWidth: parseInt(outputWidth),
          outputHeight: parseInt(outputHeight),
          scale,
        },
      });

      const requestData: CropImageData = {
        imageUrl: processingImageUrl,
        cropX: Math.round(cropArea.x),
        cropY: Math.round(cropArea.y),
        cropWidth: Math.round(cropArea.width),
        cropHeight: Math.round(cropArea.height),
        outputWidth: parseInt(outputWidth),
        outputHeight: parseInt(outputHeight),
        scale: scale,
        uploadToCloudflare: false,
        originalFilename: image?.filename || "",
        previewImageDimensions: originalDimensions,
      };

      const result = await api.post<CropImageResponse>(
        "images/crop-image",
        requestData
      );

      console.log("✅ Crop API response:", {
        success: result.success,
        hasProcessedImageUrl: !!result.processedImageUrl,
        hasImageData: !!result.imageData,
        remoteServiceUsed: result.remoteServiceUsed,
        error: result.error,
      });

      if (!result.success) {
        const errorMessage = result.error || "Processing failed";
        throw new Error(errorMessage);
      }

      // Handle both processedImageUrl (data URL) and imageData (base64)
      if (result.processedImageUrl) {
        setProcessedImageUrl(result.processedImageUrl);
      } else if (result.imageData) {
        const dataUrl = `data:image/jpeg;base64,${result.imageData}`;
        setProcessedImageUrl(dataUrl);
      } else {
        throw new Error("No processed image data received from API");
      }

      setRemoteServiceUsed(result.remoteServiceUsed || false);

      const successMessage = `Image cropped successfully using Sharp processing`;

      toast({
        title: "Crop Preview Ready",
        description: "Image cropped successfully. Review the result below.",
      });
    } catch (error: any) {
      console.error("❌ Crop processing error:", error);

      let errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      let suggestion = "";

      if (errorMessage.includes("crop-image endpoint may not be available")) {
        suggestion =
          "There may be an issue with the image processing service. Please try again.";
      }

      setError(errorMessage);

      const fullErrorMessage = suggestion
        ? `${errorMessage}\n\n💡 ${suggestion}`
        : errorMessage;

      toast({
        title: "Processing Failed",
        description: fullErrorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleHighResProcess = async (multiplier: 2 | 4) => {
    if (!api) return; // Add conditional check inside async function
    if (!processedImageUrl || !image) {
      toast({
        title: "Error",
        description: "Please process the image first",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingHighRes(true);
    setHighResMultiplier(multiplier);

    try {
      const processingImageUrl = getProcessingImageUrl(image.url || "");

      const requestData: CropImageData = {
        imageUrl: processingImageUrl,
        cropX: Math.round(cropArea.x),
        cropY: Math.round(cropArea.y),
        cropWidth: Math.round(cropArea.width),
        cropHeight: Math.round(cropArea.height),
        outputWidth: parseInt(outputWidth) * multiplier,
        outputHeight: parseInt(outputHeight) * multiplier,
        scale: scale * multiplier,
        uploadToCloudflare: false,
        originalFilename: image?.filename || "",
        scaleMultiplier: multiplier,
        previewImageDimensions: originalDimensions,
      };

      const result = await api.post<CropImageResponse>(
        "images/crop-image",
        requestData
      );

      if (!result.success) {
        const errorMessage = result.error || "High-res processing failed";
        throw new Error(errorMessage);
      }

      // Handle both processedImageUrl (data URL) and imageData (base64)
      if (result.processedImageUrl) {
        setHighResImageUrl(result.processedImageUrl);
      } else if (result.imageData) {
        const dataUrl = `data:image/jpeg;base64,${result.imageData}`;
        setHighResImageUrl(dataUrl);
      } else {
        throw new Error("No high-res processed image data received from API");
      }

      const successMessage = `${multiplier}x high-resolution image generated successfully`;
      hotToast.success(successMessage);
      toast({
        title: "Success",
        description: successMessage,
      });
    } catch (error) {
      console.error("High-res processing error:", error);

      let errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      let suggestion = "";

      if (errorMessage.includes("crop-image endpoint may not be available")) {
        suggestion =
          "There may be an issue with the image processing service. Please try again.";
      }

      setError(errorMessage);

      toast({
        title: "High-Resolution Processing Failed",
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

  const handleReplaceImage = async (multiplier: 1 | 2) => {
    if (!api) return; // Add conditional check inside async function
    if (!image || !processedImageUrl) return;

    // Add time-based lock to prevent rapid successive calls
    const now = Date.now();
    if (now - lastProcessingTime < 2000) {
      console.log(
        `🚫 handleReplaceImage(${multiplier}) blocked - too soon after last processing`
      );
      return;
    }

    // Prevent double-clicks and concurrent executions with more robust checking
    if (isReplacing1x || isReplacing2x || isReplacing) {
      console.log(
        `🚫 handleReplaceImage(${multiplier}) blocked - already processing:`,
        {
          isReplacing1x,
          isReplacing2x,
          isReplacing,
        }
      );
      return;
    }

    console.log(`🎯 handleReplaceImage(${multiplier}) starting...`);
    setLastProcessingTime(now);

    try {
      // Set the specific multiplier state first
      if (multiplier === 1) {
        setIsReplacing1x(true);
        console.log("🔒 Locked 1x processing");
      } else {
        setIsReplacing2x(true);
        console.log("🔒 Locked 2x processing");
      }

      // Set general replacing state
      setIsReplacing(true);

      console.log(`📤 Making API call with multiplier: ${multiplier}`);

      // Use the selected multiplier for the processing
      const processingImageUrl = getProcessingImageUrl(image.url || "");

      // First, process the image and upload to Cloudflare
      const processingRequestData: CropImageData = {
        imageUrl: processingImageUrl,
        cropX: Math.round(cropArea.x),
        cropY: Math.round(cropArea.y),
        cropWidth: Math.round(cropArea.width),
        cropHeight: Math.round(cropArea.height),
        outputWidth: parseInt(outputWidth) * multiplier,
        outputHeight: parseInt(outputHeight) * multiplier,
        scale: scale * multiplier,
        uploadToCloudflare: true,
        originalFilename: image?.filename || "",
        scaleMultiplier: multiplier,
        previewImageDimensions: originalDimensions,
      };

      const processingResult = await api.post<CropImageResponse>(
        "images/crop-image",
        processingRequestData
      );

      console.log(`✅ Processing result for ${multiplier}x:`, processingResult);

      if (!processingResult.success) {
        const errorMessage =
          processingResult.error || "Failed to process image";
        throw new Error(errorMessage);
      }

      // Get the processed image ID from the upload result
      const processedImageId = processingResult.processedImageUrl;

      if (!processedImageId) {
        throw new Error("Failed to get processed image ID from upload result");
      }

      console.log(
        `📝 Using already-processed image ID for ${multiplier}x:`,
        processedImageId
      );

      // Now update the gallery to use the already-processed image
      if (!image._id) {
        throw new Error("Original image ID is missing");
      }

      const replaceRequestData: ReplaceImageDirectData = {
        originalImageId: String(image._id),
        processedImageId: processedImageId,
      };

      const result = await api.post<ReplaceImageDirectResponse>(
        `galleries/${galleryId}/replace-image-direct`,
        replaceRequestData
      );

      console.log(`✅ Gallery replacement result for ${multiplier}x:`, result);

      // Verify the new image is available before updating UI
      if (result && result.processedImage && result.processedImage.url) {
        // Immediately update the UI - no need to wait for CDN propagation
        // The image component will handle loading states naturally
        console.log("🎯 Immediately updating UI with new image data...");

        if (onImageProcessed && result.originalImageId) {
          console.log("🎯 Calling onImageProcessed and closing modal...");
          onImageProcessed(result.originalImageId, result.processedImage);
          handleClose();
        }
      }

      console.log(`🎉 Successfully completed ${multiplier}x processing`);

      toast({
        title: "Success",
        description:
          multiplier === 2
            ? "High-resolution image saved to gallery successfully"
            : "Image saved to gallery successfully",
      });
    } catch (error) {
      console.error(`❌ Gallery image save error for ${multiplier}x:`, error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to save image",
        variant: "destructive",
      });
    } finally {
      console.log(`🔓 Unlocking states for ${multiplier}x processing`);
      setIsReplacing(false);
      setIsReplacing1x(false);
      setIsReplacing2x(false);
      setIsWaitingForImage(false);
    }
  };

  const handleClose = () => {
    setOutputWidth("1080");
    setOutputHeight("1080");
    setCloudflareWidth("3000");
    setCloudflareQuality("100");
    setCropArea({ x: 0, y: 0, width: 0, height: 0 });
    setScale(1.0);
    setProcessedImageUrl(null);
    setHighResImageUrl(null);
    setError(null);
    setRemoteServiceUsed(false);
    setLastProcessingTime(0);
    setProcessedDimensions(null);
    setHighResDimensions(null);
    setIsProcessingHighRes(false);
    setHighResMultiplier(null);
    setLivePreviewUrl(null);
    setCachedImagePath(null);
    setPreviewProcessingTime(null);
    setOriginalDimensions(null);
    setIsWaitingForImage(false);

    // Clear any pending preview timeouts
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }

    // Clear cached preview images
    if (livePreviewUrl) {
      URL.revokeObjectURL(livePreviewUrl);
    }

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[90vw] max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex flex-col h-full">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Crop className="h-5 w-5" />
              Image Crop Tool
            </DialogTitle>
          </DialogHeader>

          {/* Absolutely positioned crop validation checkmark */}
          {originalDimensions &&
            validateCropArea(cropArea, originalDimensions) && (
              <div className="absolute top-4 right-4 z-10 bg-green-100 border border-green-300 rounded-full p-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
            )}

          <div className="flex-1 min-h-0 space-y-4 overflow-y-auto p-1">
            {/* Main Grid: Preview (Left) and Crop Controls (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
              {/* Left Column: Live Preview - Make it fill available height */}
              <div className="space-y-2 flex flex-col">
                <div className="flex items-center justify-between flex-shrink-0">
                  <Label>Live Preview</Label>
                  {false && (
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

                <div className="border rounded-lg p-2 bg-muted/50 relative flex-1 min-h-0 max-h-[50vh]">
                  {livePreviewEnabled && livePreviewUrl ? (
                    <div className="h-full flex flex-col">
                      <div className="flex-1 flex items-center justify-center min-h-0">
                        <img
                          src={livePreviewUrl}
                          alt="Live preview"
                          className="w-full h-auto max-w-full max-h-full object-contain rounded"
                        />
                      </div>
                      {previewProcessingTime && (
                        <p className="text-xs text-muted-foreground mt-2 flex-shrink-0">
                          Generated in {previewProcessingTime}ms
                          {remoteServiceUsed && " (remote)"}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-sm text-muted-foreground">
                        {livePreviewEnabled
                          ? "Adjust crop settings to see live preview"
                          : "Enable live preview to see real-time crop results"}
                      </p>
                    </div>
                  )}
                  {/* Loading indicator */}
                  {isGeneratingPreview && (
                    <div className="absolute bottom-2 right-2">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Crop Controls */}
              <div className="space-y-4 flex flex-col">
                {/* Interactive Crop Canvas */}
                <div className="space-y-2 flex-shrink-0">
                  <Label>Interactive Crop</Label>
                  <div className="border rounded-lg p-2 bg-muted/50">
                    {currentImageUrl ? (
                      <div className="relative">
                        <canvas
                          ref={canvasRef}
                          className="max-w-full h-32 lg:h-48 border rounded cursor-crosshair"
                          onMouseDown={handleCanvasMouseDown}
                          onMouseMove={handleCanvasMouseMove}
                          onMouseUp={handleCanvasMouseUp}
                        />
                      </div>
                    ) : (
                      <div className="w-full h-32 lg:h-48 border rounded flex items-center justify-center bg-muted">
                        <p className="text-sm text-muted-foreground">
                          Loading image...
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Output Dimensions with Icons */}
                <div className="space-y-2 flex-shrink-0">
                  <div className="grid grid-cols-2 gap-4">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="space-y-1">
                            <Label className="flex items-center gap-1 text-xs">
                              <Maximize2 className="h-3 w-3" />
                              Width
                            </Label>
                            <Input
                              type="number"
                              value={outputWidth}
                              onChange={(e) => {
                                setOutputWidth(e.target.value);
                                if (shouldTriggerLivePreview()) {
                                  debouncedGeneratePreview();
                                }
                              }}
                              className="h-8 text-sm"
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Final output width in pixels</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="space-y-1">
                            <Label className="flex items-center gap-1 text-xs">
                              <Maximize2 className="h-3 w-3" />
                              Height
                            </Label>
                            <Input
                              type="number"
                              value={outputHeight}
                              onChange={(e) => {
                                setOutputHeight(e.target.value);
                                if (shouldTriggerLivePreview()) {
                                  debouncedGeneratePreview();
                                }
                              }}
                              className="h-8 text-sm"
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Final output height in pixels</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                {/* Preset Buttons */}
                <div className="space-y-2 flex-shrink-0">
                  <Label className="text-xs">Presets</Label>
                  <div className="grid grid-cols-2 gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreset(1080, 1920)}
                      className="h-7 text-xs px-2"
                    >
                      9:16
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreset(1080, 1080)}
                      className="h-7 text-xs px-2"
                    >
                      1:1
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreset(1080, 1350)}
                      className="h-7 text-xs px-2"
                    >
                      4:5
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreset(1920, 1080)}
                      className="h-7 text-xs px-2"
                    >
                      16:9
                    </Button>
                  </div>
                </div>

                {/* Crop Area with Icons */}
                <div className="space-y-2 flex-shrink-0">
                  <div className="grid grid-cols-2 gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="space-y-1">
                            <Label className="flex items-center gap-1 text-xs">
                              <Settings className="h-3 w-3" />X
                            </Label>
                            <Input
                              type="number"
                              value={Math.round(cropArea.x)}
                              onChange={(e) =>
                                setCropArea((prev) => ({
                                  ...prev,
                                  x: parseInt(e.target.value) || 0,
                                }))
                              }
                              min={0}
                              max={originalDimensions?.width || 0}
                              className="h-8 text-sm"
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Crop area X position</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="space-y-1">
                            <Label className="flex items-center gap-1 text-xs">
                              <Settings className="h-3 w-3" />Y
                            </Label>
                            <Input
                              type="number"
                              value={Math.round(cropArea.y)}
                              onChange={(e) =>
                                setCropArea((prev) => ({
                                  ...prev,
                                  y: parseInt(e.target.value) || 0,
                                }))
                              }
                              min={0}
                              max={originalDimensions?.height || 0}
                              className="h-8 text-sm"
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Crop area Y position</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="space-y-1">
                            <Label className="flex items-center gap-1 text-xs">
                              <Settings className="h-3 w-3" />W
                            </Label>
                            <Input
                              type="number"
                              value={Math.round(cropArea.width)}
                              onChange={(e) =>
                                setCropArea((prev) => ({
                                  ...prev,
                                  width: parseInt(e.target.value) || 0,
                                }))
                              }
                              min={0}
                              max={originalDimensions?.width || 0}
                              className="h-8 text-sm"
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Crop area width</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="space-y-1">
                            <Label className="flex items-center gap-1 text-xs">
                              <Settings className="h-3 w-3" />H
                            </Label>
                            <Input
                              type="number"
                              value={Math.round(cropArea.height)}
                              onChange={(e) =>
                                setCropArea((prev) => ({
                                  ...prev,
                                  height: parseInt(e.target.value) || 0,
                                }))
                              }
                              min={0}
                              max={originalDimensions?.height || 0}
                              className="h-8 text-sm"
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Crop area height</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                {/* Scale Control */}
                <div className="space-y-2 flex-shrink-0">
                  <Label className="text-xs">Scale: {scale.toFixed(1)}x</Label>
                  <Slider
                    value={[scale]}
                    onValueChange={(value) => {
                      setScale(value[0]);
                      if (shouldTriggerLivePreview()) {
                        debouncedGeneratePreview();
                      }
                    }}
                    min={0.1}
                    max={3.0}
                    step={0.1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0.1x</span>
                    <span>3.0x</span>
                  </div>
                </div>

                {/* Processed Image Preview - only show when live preview is not active */}
                {processedImageUrl &&
                  !(livePreviewEnabled && livePreviewUrl) && (
                    <div className="space-y-1 flex-shrink-0">
                      <Label className="text-xs">Processed Image</Label>
                      <div className="border rounded-lg p-2 bg-muted/50">
                        <CloudflareImage
                          src={processedImageUrl}
                          alt="Processed image"
                          width={300}
                          height={300}
                          className="w-full h-auto max-h-32 object-contain rounded"
                          variant="medium"
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
              </div>
            </div>
          </div>

          {/* Sticky Footer with Buttons */}
          <DialogFooter className="flex-shrink-0 border-t bg-background p-4 mt-4">
            <div className="flex flex-wrap gap-2 w-full justify-between items-center">
              <div className="flex gap-2 flex-wrap items-center">
                {/* Process Button */}
                <Button
                  onClick={handleProcess}
                  disabled={
                    isProcessing ||
                    !image ||
                    !originalDimensions ||
                    !validateCropArea(cropArea, originalDimensions)
                  }
                  className="bg-black hover:bg-gray-800 text-white"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Crop className="mr-2 h-4 w-4" />
                      Crop Image (Preview)
                    </>
                  )}
                </Button>

                {/* Download Button */}
                {processedImageUrl && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const imageUrl = processedImageUrl;
                      if (imageUrl) {
                        const link = document.createElement("a");
                        link.href = imageUrl;
                        link.download = `cropped_${image?.filename || "image"}.jpg`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                )}

                {/* Save Button with Resolution Options */}
                {processedImageUrl && (
                  <div className="flex gap-1">
                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleReplaceImage(1);
                      }}
                      disabled={
                        isReplacing1x || isReplacing2x || isWaitingForImage
                      }
                      className="border-gray-300 hover:bg-gray-50"
                      variant="outline"
                    >
                      {isReplacing1x ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {isWaitingForImage
                            ? "Waiting for image..."
                            : "Saving..."}
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          1x (Save)
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleReplaceImage(2);
                      }}
                      disabled={
                        isReplacing1x || isReplacing2x || isWaitingForImage
                      }
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      variant="default"
                    >
                      {isReplacing2x ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {isWaitingForImage
                            ? "Waiting for image..."
                            : "Saving..."}
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          2x (Save)
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>

              <Button variant="outline" onClick={handleClose}>
                <X className="mr-2 h-4 w-4" />
                Close
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
