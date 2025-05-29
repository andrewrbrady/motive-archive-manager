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
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { CloudflareImage } from "@/components/ui/CloudflareImage";
import { useGalleryImageProcessing } from "@/lib/hooks/useGalleryImageProcessing";

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

type ProcessingMethod = "cloud" | "local";

interface GalleryCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: ImageData | null;
  galleryId: string;
  onImageProcessed?: (originalImageId: string, newImageData: any) => void;
}

export function GalleryCropModal({
  isOpen,
  onClose,
  image,
  galleryId,
  onImageProcessed,
}: GalleryCropModalProps) {
  const { replaceImageInGallery } = useGalleryImageProcessing();

  // State management
  const [cropArea, setCropArea] = useState<CropArea>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [scale, setScale] = useState<number>(1.0);
  const [outputWidth, setOutputWidth] = useState<string>("1080");
  const [outputHeight, setOutputHeight] = useState<string>("1920");
  const [cloudflareWidth, setCloudflareWidth] = useState<string>("3000");
  const [cloudflareQuality, setCloudflareQuality] = useState<string>("100");
  const [processingMethod, setProcessingMethod] =
    useState<ProcessingMethod>("cloud");

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

  // Load processing method preference from localStorage
  useEffect(() => {
    const savedMethod = localStorage.getItem(
      "galleryCropMethod"
    ) as ProcessingMethod;
    if (savedMethod && (savedMethod === "cloud" || savedMethod === "local")) {
      setProcessingMethod(savedMethod);
    }

    // Load live preview preference
    const savedLivePreview = localStorage.getItem("galleryCropLivePreview");
    if (savedLivePreview !== null) {
      setLivePreviewEnabled(savedLivePreview === "true");
    }
  }, []);

  // Save processing method preference to localStorage
  const handleProcessingMethodChange = (method: ProcessingMethod) => {
    setProcessingMethod(method);
    localStorage.setItem("galleryCropMethod", method);
  };

  // Save live preview preference and handle toggle
  const handleLivePreviewToggle = (enabled: boolean) => {
    setLivePreviewEnabled(enabled);
    localStorage.setItem("galleryCropLivePreview", enabled.toString());

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

      const urlParts = baseUrl.split("/");
      urlParts[urlParts.length - 1] = `w=${cloudflareWidth},q=100`;
      return urlParts.join("/");
    },
    [cloudflareWidth]
  );

  // Get preview image URL (medium resolution for caching)
  const getPreviewImageUrl = useCallback((baseUrl: string) => {
    if (!baseUrl.includes("imagedelivery.net")) return baseUrl;

    const urlParts = baseUrl.split("/");
    urlParts[urlParts.length - 1] = "w=1500,q=90";
    return urlParts.join("/");
  }, []);

  // Cache image locally for live preview
  const cacheImageForPreview = useCallback(async () => {
    if (
      !image?.url ||
      processingMethod !== "local" ||
      process.env.NODE_ENV !== "development"
    )
      return;

    try {
      const previewImageUrl = getPreviewImageUrl(image.url);

      const response = await fetch("/api/images/cache-for-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl: previewImageUrl,
          imageId: image._id,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setCachedImagePath(result.cachedPath);
          console.log("Image cached for preview:", result.cachedPath);
        }
      }
    } catch (error) {
      console.error("Failed to cache image for preview:", error);
    }
  }, [image?.url, image?._id, processingMethod, getPreviewImageUrl]);

  // Generate live preview using C++ executable
  const generateLivePreview = useCallback(async () => {
    if (
      !livePreviewEnabled ||
      !cachedImagePath ||
      !originalDimensions ||
      processingMethod !== "local" ||
      process.env.NODE_ENV !== "development"
    ) {
      return;
    }

    setIsGeneratingPreview(true);

    try {
      const response = await fetch("/api/images/live-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
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
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.previewImageData) {
          const byteCharacters = atob(result.previewImageData);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: "image/jpeg" });

          if (livePreviewUrl) {
            URL.revokeObjectURL(livePreviewUrl);
          }

          const blobUrl = URL.createObjectURL(blob);
          setLivePreviewUrl(blobUrl);
          setPreviewProcessingTime(result.processingTime);
        }
      }
    } catch (error) {
      console.error("Failed to generate live preview:", error);
    } finally {
      setIsGeneratingPreview(false);
    }
  }, [
    livePreviewEnabled,
    cachedImagePath,
    originalDimensions,
    cropArea,
    scale,
    outputWidth,
    outputHeight,
    processingMethod,
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
      processingMethod === "local" &&
      process.env.NODE_ENV === "development"
    );
  }, [livePreviewEnabled, cachedImagePath, processingMethod]);

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
    console.log("URL transformation:", {
      original: image.url,
      enhanced: enhanced,
      width: cloudflareWidth,
      quality: cloudflareQuality,
    });
    return enhanced;
  }, [image?.url, cloudflareWidth, cloudflareQuality]);

  // Load original image dimensions
  useEffect(() => {
    if (enhancedImageUrl) {
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

        // Initialize crop area based on current output dimensions
        initializeCropArea(
          dimensions,
          parseInt(outputWidth),
          parseInt(outputHeight)
        );
      };
      img.src = enhancedImageUrl;
    }
  }, [enhancedImageUrl, outputWidth, outputHeight, initializeCropArea]);

  // Cache image for live preview when modal opens
  useEffect(() => {
    if (isOpen && image?.url && processingMethod === "local") {
      cacheImageForPreview();
    }
  }, [isOpen, image?.url, processingMethod, cacheImageForPreview]);

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

  // Draw the crop preview on canvas
  const drawCropPreview = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !enhancedImageUrl || !originalDimensions) return;

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
    img.src = enhancedImageUrl;
  }, [enhancedImageUrl, originalDimensions, cropArea]);

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

    // Trigger live preview on drag
    if (shouldTriggerLivePreview()) {
      debouncedGeneratePreview();
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  const handleProcess = async () => {
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
    setProcessingStatus("Processing image...");

    try {
      const processingImageUrl = getProcessingImageUrl(image.url || "");

      console.log("🚀 Making crop API call with:", {
        processingImageUrl: processingImageUrl.substring(0, 100) + "...",
        cropArea,
        outputWidth: parseInt(outputWidth),
        outputHeight: parseInt(outputHeight),
        scale,
        processingMethod,
        originalDimensions,
      });

      const response = await fetch("/api/images/crop-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl: processingImageUrl,
          cropX: Math.round(cropArea.x),
          cropY: Math.round(cropArea.y),
          cropWidth: Math.round(cropArea.width),
          cropHeight: Math.round(cropArea.height),
          outputWidth: parseInt(outputWidth),
          outputHeight: parseInt(outputHeight),
          scale: scale,
          processingMethod: processingMethod,
          uploadToCloudflare: false,
          originalFilename: image?.filename,
          originalCarId: image?.carId,
          previewImageDimensions: originalDimensions,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Processing failed");
      }

      const result = await response.json();

      if (result.success) {
        if (result.processedImageUrl) {
          setProcessedImageUrl(result.processedImageUrl);
        } else if (result.imageData) {
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
          description: `Image cropped successfully using ${
            result.remoteServiceUsed ? "Cloud Run service" : "local binary"
          }`,
        });
      } else {
        throw new Error(result.error || "Processing failed");
      }
    } catch (error) {
      console.error("Processing error:", error);

      let errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      let suggestion = "";

      if (errorMessage.includes("crop-image endpoint may not be available")) {
        suggestion =
          "Try switching to 'Local Processing' in the settings below.";
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

    setIsProcessingHighRes(true);
    setHighResMultiplier(multiplier);
    setProcessingStatus(
      multiplier === 2
        ? "Processing and uploading high-resolution image..."
        : "Processing and uploading image..."
    );

    try {
      const processingImageUrl = getProcessingImageUrl(image.url || "");

      const response = await fetch("/api/images/crop-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl: processingImageUrl,
          cropX: Math.round(cropArea.x),
          cropY: Math.round(cropArea.y),
          cropWidth: Math.round(cropArea.width),
          cropHeight: Math.round(cropArea.height),
          outputWidth: parseInt(outputWidth) * multiplier,
          outputHeight: parseInt(outputHeight) * multiplier,
          scale: scale * multiplier,
          processingMethod: processingMethod,
          uploadToCloudflare: false,
          originalFilename: image?.filename,
          originalCarId: image?.carId,
          previewImageDimensions: originalDimensions,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "High-res processing failed");
      }

      const result = await response.json();

      if (result.success) {
        if (result.processedImageUrl) {
          setHighResImageUrl(result.processedImageUrl);
        } else if (result.imageData) {
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
          multiplier === 2
            ? "2x high-resolution image generated successfully"
            : "4x high-resolution image generated successfully"
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
    if (!image || !processedImageUrl) return;

    // Prevent double-clicks and concurrent executions
    if (isReplacing1x || isReplacing2x) return;

    try {
      if (multiplier === 1) {
        setIsReplacing1x(true);
      } else {
        setIsReplacing2x(true);
      }

      setIsReplacing(true);
      setProcessingStatus(
        multiplier === 1
          ? "Saving standard resolution image..."
          : "Saving high-resolution image..."
      );

      // Use the selected multiplier for the processing
      const processingImageUrl = getProcessingImageUrl(image.url || "");

      // First, process the image and upload to Cloudflare
      const processingResponse = await fetch("/api/images/crop-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl: processingImageUrl,
          cropX: Math.round(cropArea.x),
          cropY: Math.round(cropArea.y),
          cropWidth: Math.round(cropArea.width),
          cropHeight: Math.round(cropArea.height),
          outputWidth: parseInt(outputWidth) * multiplier,
          outputHeight: parseInt(outputHeight) * multiplier,
          scale: scale * multiplier,
          processingMethod,
          uploadToCloudflare: true, // This is key - we need to upload to Cloudflare
          originalFilename: image?.filename,
          originalCarId: image?.carId,
          previewImageDimensions: originalDimensions,
        }),
      });

      if (!processingResponse.ok) {
        const errorData = await processingResponse.json();
        throw new Error(errorData.error || "Failed to process image");
      }

      const processingResult = await processingResponse.json();

      if (
        !processingResult.success ||
        !processingResult.cloudflareUpload?.success
      ) {
        throw new Error("Failed to upload processed image to Cloudflare");
      }

      setProcessingStatus("Updating gallery...");

      // Now replace the image in the gallery using the uploaded image data
      const parameters = {
        imageUrl: processingImageUrl,
        cropX: Math.round(cropArea.x),
        cropY: Math.round(cropArea.y),
        cropWidth: Math.round(cropArea.width),
        cropHeight: Math.round(cropArea.height),
        outputWidth: parseInt(outputWidth) * multiplier,
        outputHeight: parseInt(outputHeight) * multiplier,
        scale: scale * multiplier,
        processingMethod,
      };

      const response = await fetch(
        `/api/galleries/${galleryId}/replace-image`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            originalImageId: image._id,
            processingType: "crop" as const,
            parameters,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to replace image");
      }

      const result = await response.json();

      // Verify the new image is available before updating UI
      if (result && result.processedImage && result.processedImage.url) {
        setProcessingStatus("Verifying image availability...");

        // Wait a moment for CDN processing and verify image loads
        await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            console.log(
              "✅ New image verified as available:",
              result.processedImage.url
            );
            resolve(true);
          };
          img.onerror = () => {
            console.warn(
              "⚠️ New image not immediately available, proceeding anyway"
            );
            resolve(true);
          };
          // Add cache-busting parameter and small delay
          setTimeout(() => {
            img.src = `${result.processedImage.url}?v=${Date.now()}`;
          }, 500);
        });

        if (onImageProcessed) {
          onImageProcessed(result.originalImageId, result.processedImage);
          handleClose();
        }
      }

      toast({
        title: "Success",
        description:
          multiplier === 2
            ? "High-resolution image saved to gallery successfully"
            : "Image saved to gallery successfully",
      });
    } catch (error) {
      console.error("Gallery image save error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to save image",
        variant: "destructive",
      });
    } finally {
      setIsReplacing(false);
      setIsReplacing1x(false);
      setIsReplacing2x(false);
      setProcessingStatus("");
    }
  };

  const handleClose = () => {
    setCropArea({ x: 0, y: 0, width: 0, height: 0 });
    setScale(1.0);
    setOutputWidth("1080");
    setOutputHeight("1920");
    setProcessedImageUrl(null);
    setProcessingStatus("");
    setError(null);
    setRemoteServiceUsed(false);
    setLivePreviewUrl(null);
    setCachedImagePath(null);
    setPreviewProcessingTime(null);

    // Clean up any blob URLs
    if (livePreviewUrl) {
      URL.revokeObjectURL(livePreviewUrl);
    }

    onClose();
  };

  // Get the current enhanced image URL for display
  const currentImageUrl = enhancedImageUrl;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[85vw] max-h-[70vh] overflow-y-auto">
        <div className="relative">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crop className="h-5 w-5" />
              Image Crop Tool
            </DialogTitle>
            <DialogDescription>
              Crop and scale your image for social media formats. Drag the crop
              area on the preview to adjust.
            </DialogDescription>
          </DialogHeader>

          {/* Absolutely positioned crop validation checkmark */}
          {originalDimensions &&
            validateCropArea(cropArea, originalDimensions) && (
              <div className="absolute top-4 right-4 z-10 bg-green-100 border border-green-300 rounded-full p-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
            )}

          <div className="space-y-4 mt-4">
            {/* Main Grid: Preview (Left) and Crop Controls (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left Column: Live Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Live Preview</Label>
                  {processingMethod === "local" &&
                    process.env.NODE_ENV === "development" && (
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

                <div className="border rounded-lg p-2 bg-muted/50 relative">
                  {livePreviewEnabled &&
                  processingMethod === "local" &&
                  process.env.NODE_ENV === "development" &&
                  livePreviewUrl ? (
                    <div className="space-y-2">
                      {/* Fill available height instead of fixed aspect ratio */}
                      <div className="relative w-full h-[40vh]">
                        <CloudflareImage
                          src={livePreviewUrl}
                          alt="Live preview"
                          width={800}
                          height={1000}
                          className="absolute inset-0 w-full h-full object-contain rounded border"
                          variant="medium"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          Live Preview (800px wide)
                        </p>
                        {previewProcessingTime && (
                          <p className="text-xs text-muted-foreground">
                            {previewProcessingTime}ms
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="relative w-full h-[40vh] flex items-center justify-center text-muted-foreground">
                      <div className="text-center space-y-2">
                        <Eye className="h-8 w-8 mx-auto opacity-50" />
                        <p className="text-sm">
                          {process.env.NODE_ENV !== "development"
                            ? "Live preview available in development mode only"
                            : processingMethod !== "local"
                              ? "Live preview only available with local processing"
                              : livePreviewEnabled
                                ? "Adjust crop area to see live preview"
                                : "Enable live preview to see real-time results"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Crop Canvas + All Controls */}
              <div className="space-y-3">
                {/* Crop Canvas */}
                <div>
                  <Label>Image Preview & Crop Area</Label>
                  <div className="border rounded-lg p-2 bg-muted/50 mt-1">
                    {currentImageUrl ? (
                      <canvas
                        ref={canvasRef}
                        className="border rounded cursor-move max-w-full"
                        onMouseDown={handleCanvasMouseDown}
                        onMouseMove={handleCanvasMouseMove}
                        onMouseUp={handleCanvasMouseUp}
                        onMouseLeave={handleCanvasMouseUp}
                      />
                    ) : (
                      <div className="h-48 flex items-center justify-center text-muted-foreground">
                        No image selected
                      </div>
                    )}
                  </div>
                  {originalDimensions && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Drag to move the crop area. Original:{" "}
                      {originalDimensions.width}×{originalDimensions.height}
                    </p>
                  )}
                </div>

                {/* Output Dimensions - at the top in two columns */}
                <div className="space-y-2">
                  <Label>Output Dimensions</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="outputWidth" className="text-xs">
                        Width
                      </Label>
                      <Input
                        id="outputWidth"
                        type="number"
                        value={outputWidth}
                        onChange={(e) => {
                          setOutputWidth(e.target.value);
                          if (shouldTriggerLivePreview()) {
                            debouncedGeneratePreview();
                          }
                        }}
                        min="1"
                        max="8000"
                      />
                    </div>
                    <div>
                      <Label htmlFor="outputHeight" className="text-xs">
                        Height
                      </Label>
                      <Input
                        id="outputHeight"
                        type="number"
                        value={outputHeight}
                        onChange={(e) => {
                          setOutputHeight(e.target.value);
                          if (shouldTriggerLivePreview()) {
                            debouncedGeneratePreview();
                          }
                        }}
                        min="1"
                        max="8000"
                      />
                    </div>
                  </div>

                  {/* Quick presets */}
                  <div className="flex gap-1 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs px-2 py-1 h-auto"
                      onClick={() => {
                        setOutputWidth("1080");
                        setOutputHeight("1920");
                      }}
                    >
                      9:16
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs px-2 py-1 h-auto"
                      onClick={() => {
                        setOutputWidth("1080");
                        setOutputHeight("1080");
                      }}
                    >
                      1:1
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs px-2 py-1 h-auto"
                      onClick={() => {
                        setOutputWidth("1080");
                        setOutputHeight("1350");
                      }}
                    >
                      4:5
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs px-2 py-1 h-auto"
                      onClick={() => {
                        setOutputWidth("1920");
                        setOutputHeight("1080");
                      }}
                    >
                      16:9
                    </Button>
                  </div>
                </div>

                {/* Crop Area Controls */}
                <div className="space-y-2">
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
                            if (shouldTriggerLivePreview()) {
                              debouncedGeneratePreview();
                            }
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
                            if (shouldTriggerLivePreview()) {
                              debouncedGeneratePreview();
                            }
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
                            if (shouldTriggerLivePreview()) {
                              debouncedGeneratePreview();
                            }
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
                            if (shouldTriggerLivePreview()) {
                              debouncedGeneratePreview();
                            }
                          }
                        }}
                        min="1"
                        max={originalDimensions?.height || 0}
                      />
                    </div>
                  </div>
                </div>

                {/* Scale Control */}
                <div className="space-y-1">
                  <Label>Scale: {scale.toFixed(1)}x</Label>
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

                {/* Processing Method */}
                <div className="space-y-1">
                  <Label>Processing Method</Label>
                  <Select
                    value={processingMethod}
                    onValueChange={handleProcessingMethodChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cloud">
                        <div className="flex items-center gap-2">
                          <Cloud className="h-4 w-4" />
                          Cloud Processing (Recommended)
                        </div>
                      </SelectItem>
                      <SelectItem value="local">
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4" />
                          Local Processing
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Messages */}
                {processingStatus && (
                  <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">{processingStatus}</p>
                  </div>
                )}

                {error && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                {/* Processed Image Preview - only show when live preview is not active */}
                {processedImageUrl &&
                  !(
                    livePreviewEnabled &&
                    processingMethod === "local" &&
                    process.env.NODE_ENV === "development"
                  ) && (
                    <div className="space-y-1">
                      <Label>Processed Image</Label>
                      <div className="border rounded-lg p-2 bg-muted/50">
                        <CloudflareImage
                          src={processedImageUrl}
                          alt="Processed image"
                          width={300}
                          height={300}
                          className="w-full h-auto max-h-48 object-contain rounded"
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

          <DialogFooter className="flex flex-wrap gap-2">
            <div className="flex gap-2 flex-wrap">
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
                    disabled={isReplacing1x || isReplacing2x}
                    className="border-gray-300 hover:bg-gray-50"
                    variant="outline"
                  >
                    {isReplacing1x ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
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
                    disabled={isReplacing1x || isReplacing2x}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    variant="default"
                  >
                    {isReplacing2x ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
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
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
