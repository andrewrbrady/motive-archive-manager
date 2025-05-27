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
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import Image from "next/image";

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: ImageData | null;
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

type ProcessingMethod = "cloud" | "local";

export function ImageCropModal({
  isOpen,
  onClose,
  image,
}: ImageCropModalProps) {
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

  // Processing settings
  const [processingMethod, setProcessingMethod] =
    useState<ProcessingMethod>("cloud");

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

  // Load processing method preference from localStorage
  useEffect(() => {
    const savedMethod = localStorage.getItem(
      "imageCropMethod"
    ) as ProcessingMethod;
    if (savedMethod && (savedMethod === "cloud" || savedMethod === "local")) {
      setProcessingMethod(savedMethod);
    }
  }, []);

  // Save processing method preference to localStorage
  const handleProcessingMethodChange = (method: ProcessingMethod) => {
    setProcessingMethod(method);
    localStorage.setItem("imageCropMethod", method);
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
  const getProcessingImageUrl = useCallback((baseUrl: string) => {
    if (!baseUrl.includes("imagedelivery.net")) return baseUrl;

    const urlParts = baseUrl.split("/");
    // Request high resolution for processing: width=5000, quality=100
    urlParts[urlParts.length - 1] = "w=5000,q=100";
    return urlParts.join("/");
  }, []);

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
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
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

      const response = await fetch("/api/images/crop-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl: processingImageUrl, // Use high-res for processing
          cropX: cropArea.x,
          cropY: cropArea.y,
          cropWidth: cropArea.width,
          cropHeight: cropArea.height,
          outputWidth: parseInt(outputWidth),
          outputHeight: parseInt(outputHeight),
          scale: scale,
          uploadToCloudflare: false, // Don't upload yet, just process
          originalFilename: image?.filename,
          originalCarId: image?.carId,
          previewImageDimensions: originalDimensions, // Pass preview dimensions for scaling
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Processing failed");
      }

      const result = await response.json();

      if (result.success) {
        // Convert base64 to blob URL for preview
        if (result.imageData) {
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

        setRemoteServiceUsed(false);
        setProcessingStatus("Processing completed successfully!");

        toast({
          title: "Success",
          description: "Image cropped successfully",
        });
      } else {
        throw new Error(result.error || "Processing failed");
      }
    } catch (error) {
      console.error("Processing error:", error);
      setError(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Processing failed",
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
    setProcessingStatus(`Generating ${multiplier}x high-resolution version...`);

    try {
      const processingImageUrl = getProcessingImageUrl(image.url || "");

      const response = await fetch("/api/images/crop-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl: processingImageUrl, // Use high-res for processing
          cropX: cropArea.x,
          cropY: cropArea.y,
          cropWidth: cropArea.width,
          cropHeight: cropArea.height,
          outputWidth: parseInt(outputWidth) * multiplier,
          outputHeight: parseInt(outputHeight) * multiplier,
          scale: scale * multiplier,
          uploadToCloudflare: false, // Don't upload yet, just process
          originalFilename: image?.filename,
          originalCarId: image?.carId,
          previewImageDimensions: originalDimensions, // Pass preview dimensions for scaling
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "High-res processing failed");
      }

      const result = await response.json();

      if (result.success) {
        // Convert base64 to blob URL for preview
        if (result.imageData) {
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
      setError(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "High-res processing failed",
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

    setIsUploading(true);
    setProcessingStatus("Uploading to Cloudflare...");

    try {
      // Use the higher resolution parameters if high-res image exists
      const isHighRes = !!highResImageUrl;
      const multiplier = isHighRes ? highResMultiplier || 2 : 1;

      const processingImageUrl = getProcessingImageUrl(image?.url || "");

      const response = await fetch("/api/images/crop-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl: processingImageUrl, // Use high-res for processing
          cropX: cropArea.x,
          cropY: cropArea.y,
          cropWidth: cropArea.width,
          cropHeight: cropArea.height,
          outputWidth: parseInt(outputWidth) * multiplier,
          outputHeight: parseInt(outputHeight) * multiplier,
          scale: scale * multiplier,
          uploadToCloudflare: true, // Upload this time
          originalFilename: image?.filename,
          originalCarId: image?.carId,
          previewImageDimensions: originalDimensions, // Pass preview dimensions for scaling
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const result = await response.json();

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
      setError(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Upload failed",
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
    onClose();
  };

  // Get the current enhanced image URL for display
  const currentImageUrl = enhancedImageUrl;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Image Preview and Crop Controls */}
          <div className="space-y-4">
            {/* Image Preview with Crop Overlay */}
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
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No image selected
                  </div>
                )}
              </div>
            </div>

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
                onValueChange={(value) => setScale(value[0])}
                min={0.1}
                max={3.0}
                step={0.1}
                className="w-full"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setScale(0.5)}
                >
                  0.5x
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setScale(1.0)}
                >
                  1.0x
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setScale(1.5)}
                >
                  1.5x
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setScale(2.0)}
                >
                  2.0x
                </Button>
              </div>
            </div>
          </div>

          {/* Right Column: Output Settings and Controls */}
          <div className="space-y-4">
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
                    onChange={(e) => setOutputWidth(e.target.value)}
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
                    onChange={(e) => setOutputHeight(e.target.value)}
                    placeholder="1920"
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
                    setOutputWidth("1080");
                    setOutputHeight("1920");
                    if (originalDimensions) {
                      initializeCropArea(originalDimensions, 1080, 1920);
                    }
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
                    setOutputWidth("1080");
                    setOutputHeight("1350");
                    if (originalDimensions) {
                      initializeCropArea(originalDimensions, 1080, 1350);
                    }
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
                    setOutputWidth("1080");
                    setOutputHeight("1080");
                    if (originalDimensions) {
                      initializeCropArea(originalDimensions, 1080, 1080);
                    }
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
                    setOutputWidth("1920");
                    setOutputHeight("1080");
                    if (originalDimensions) {
                      initializeCropArea(originalDimensions, 1920, 1080);
                    }
                  }}
                  className="text-xs"
                >
                  16:9 (1920×1080)
                </Button>
              </div>
            </div>

            {/* Processing Method */}
            <div className="space-y-2">
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
                      {isProcessing || isProcessingHighRes || isUploading ? (
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
                    className="w-full h-auto max-h-48 object-contain rounded"
                  />
                  {processedDimensions && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {processedDimensions.width}×{processedDimensions.height}
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
                    className="w-full h-auto max-h-48 object-contain rounded"
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
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
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
                  Crop Image
                </>
              )}
            </Button>

            {/* High-res Processing Buttons */}
            {processedImageUrl && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleHighResProcess(2)}
                  disabled={isProcessingHighRes}
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
                  variant="outline"
                  onClick={() => handleHighResProcess(4)}
                  disabled={isProcessingHighRes}
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

            {/* Download Buttons */}
            {processedImageUrl && (
              <Button variant="outline" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            )}

            {highResImageUrl && (
              <Button variant="outline" onClick={handleHighResDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download High-Res
              </Button>
            )}

            {/* Upload Button */}
            {(processedImageUrl || highResImageUrl) && !cloudflareResult && (
              <Button
                variant="outline"
                onClick={handleUploadToCloudflare}
                disabled={isUploading}
                className="border-gray-300 hover:bg-gray-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload to Gallery
                  </>
                )}
              </Button>
            )}

            {/* View in Gallery Button */}
            {cloudflareResult && (
              <Button variant="outline" onClick={handleViewInGallery}>
                <ExternalLink className="mr-2 h-4 w-4" />
                View in Gallery
              </Button>
            )}

            {/* Reset Button */}
            <Button variant="outline" onClick={handleReset}>
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
