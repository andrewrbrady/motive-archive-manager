import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "@/components/ui/use-toast";
import { useAPI } from "@/hooks/useAPI";
import { useGalleryImageProcessing } from "./useGalleryImageProcessing";
import {
  ProcessingType,
  ProcessableImageData,
  ProcessedImageData,
  ImageDimensions,
} from "@/components/ui/image-processing/types";

interface CloudflareUploadResult {
  success: boolean;
  imageId?: string;
  imageUrl?: string;
  filename?: string;
  mongoId?: string;
  error?: string;
}

interface UseImageProcessingParams {
  image: ProcessableImageData | null;
  processingType: ProcessingType;
  enablePreview?: boolean;
  galleryId?: string;
  onImageReplaced?: (originalImageId: string, newImageData: any) => void;
}

export function useImageProcessing({
  image,
  processingType,
  enablePreview = false,
  galleryId,
  onImageReplaced,
}: UseImageProcessingParams) {
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

  // Processing state
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

  // Parameters for processing
  const [parameters, setParameters] = useState<any>({});

  // Load image dimensions when image changes
  useEffect(() => {
    if (image?.url) {
      const img = new Image();
      img.onload = () => {
        setOriginalDimensions({ width: img.width, height: img.height });
      };
      img.onerror = () => {
        setError("Failed to load image dimensions");
      };
      img.src = image.url;
    }
  }, [image?.url]);

  // Validation for whether processing can proceed
  const canProcess =
    !!image && !!originalDimensions && Object.keys(parameters).length > 0;

  // Handler functions
  const handleProcess = async () => {
    if (!image || !canProcess) {
      toast({
        title: "Error",
        description: "Image and parameters are required",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProcessingStatus("Processing image...");
    setError(null);

    try {
      if (!api) {
        throw new Error("Authentication required");
      }

      const payload = {
        imageId: image._id,
        processingType,
        parameters: {
          ...parameters,
          imageUrl: image.url,
          originalFilename: image.filename,
          originalCarId: image.carId,
          scaleMultiplier: 1, // Add scale multiplier for canvas extension
          previewImageDimensions: originalDimensions, // Add preview dimensions for coordinate scaling
        },
      };

      const result = await api.post<{ processedImageUrl?: string }>(
        `images/process`,
        payload
      );

      if (result.processedImageUrl) {
        setProcessedImageUrl(result.processedImageUrl);
        setProcessingStatus("Processing completed successfully");

        // Load processed image dimensions
        const img = new Image();
        img.onload = () => {
          setProcessedDimensions({ width: img.width, height: img.height });
        };
        img.src = result.processedImageUrl;
      }

      toast({
        title: "Success",
        description: "Image processed successfully",
      });
    } catch (error: any) {
      const errorMessage = error?.message || "Processing failed";
      setError(errorMessage);
      setProcessingStatus("");

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleHighResProcess = async (multiplier: 2 | 4) => {
    if (!image || !canProcess) {
      toast({
        title: "Error",
        description: "Image and parameters are required",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingHighRes(true);
    setHighResMultiplier(multiplier);
    setProcessingStatus(`Processing high-resolution image (${multiplier}x)...`);
    setError(null);

    try {
      if (!api) {
        throw new Error("Authentication required");
      }

      const payload = {
        imageId: image._id,
        processingType,
        parameters: {
          ...parameters,
          imageUrl: image.url,
          originalFilename: image.filename,
          originalCarId: image.carId,
          outputWidth: (parseInt(parameters.outputWidth) || 1080) * multiplier,
          outputHeight:
            (parseInt(parameters.outputHeight) || 1920) * multiplier,
          scaleMultiplier: multiplier, // Add scale multiplier for canvas extension
          previewImageDimensions: originalDimensions, // Add preview dimensions for coordinate scaling
          // For canvas extension, dimensions should already be correctly set
          // The multiplier is used for filename generation and variant selection
        },
      };

      const result = await api.post<{ processedImageUrl?: string }>(
        `images/process`,
        payload
      );

      if (result.processedImageUrl) {
        setHighResImageUrl(result.processedImageUrl);
        setProcessingStatus(
          `High-resolution processing completed (${multiplier}x)`
        );

        // Load high-res image dimensions
        const img = new Image();
        img.onload = () => {
          setHighResDimensions({ width: img.width, height: img.height });
        };
        img.src = result.processedImageUrl;
      }

      toast({
        title: "Success",
        description: `High-resolution image processed successfully (${multiplier}x)`,
      });
    } catch (error: any) {
      const errorMessage =
        error?.message || "High-resolution processing failed";
      setError(errorMessage);

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessingHighRes(false);
    }
  };

  const handleUploadToCloudflare = async () => {
    const imageUrl = highResImageUrl || processedImageUrl;
    if (!imageUrl) {
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
      if (!api) {
        throw new Error("Authentication required");
      }

      const result = await api.post<CloudflareUploadResult>(
        `images/upload-to-cloudflare`,
        {
          imageUrl,
          filename: `${image?.filename || "processed"}_${processingType}`,
        }
      );

      setCloudflareResult(result);
      setProcessingStatus("Upload completed successfully");

      toast({
        title: "Success",
        description: "Image uploaded to Cloudflare successfully",
      });
    } catch (error: any) {
      const errorMessage = error?.message || "Upload failed";
      setError(errorMessage);

      toast({
        title: "Error",
        description: errorMessage,
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
    link.download = `${image?.filename || "processed"}_${processingType}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleHighResDownload = () => {
    if (!highResImageUrl) return;

    const link = document.createElement("a");
    link.href = highResImageUrl;
    link.download = `${image?.filename || "processed"}_${processingType}_highres.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewInGallery = () => {
    if (cloudflareResult?.imageId) {
      window.open(`/images/${cloudflareResult.imageId}`, "_blank");
    }
  };

  const handleReset = () => {
    setProcessedImage(null);
    setShowPreview(false);
    setProcessedImageUrl(null);
    setHighResImageUrl(null);
    setProcessedDimensions(null);
    setHighResDimensions(null);
    setCloudflareResult(null);
    setProcessingStatus("");
    setError(null);
    setHighResMultiplier(null);
  };

  const handlePreview = async () => {
    if (!enablePreview || !galleryId || !image || !canProcess) {
      toast({
        title: "Error",
        description: "Preview requires gallery context and valid parameters",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await previewProcessImage({
        galleryId,
        imageId: image._id,
        processingType,
        parameters,
      });

      if (result) {
        setProcessedImage(result.processedImage);
        setShowPreview(true);
      }
    } catch (error) {
      console.error("Preview error:", error);
    }
  };

  const handleReplaceImage = async (scale: number = 1) => {
    if (!enablePreview || !galleryId || !image || !canProcess) {
      toast({
        title: "Error",
        description: "Replace requires gallery context and valid parameters",
        variant: "destructive",
      });
      return;
    }

    console.log(
      `🚨🚨🚨 useImageProcessing.handleReplaceImage CALLED with scale: ${scale} 🚨🚨🚨`
    );

    try {
      // Create parameters with scale for high-res replacement
      let scaledParameters = {
        ...parameters,
        scale,
        outputWidth:
          scale > 1
            ? String(parseInt(parameters.outputWidth || "1080") * scale)
            : parameters.outputWidth,
        outputHeight:
          scale > 1
            ? String(parseInt(parameters.outputHeight || "1920") * scale)
            : parameters.outputHeight,
        // For 2x+ processing, use higher resolution source
        sourceImageWidth: scale >= 2 ? 3000 : undefined,
      };

      // Apply the same coordinate scaling logic as download for crop and canvas extension operations
      // For gallery replacement, send raw coordinates to backend - let backend handle ALL scaling
      if (
        (processingType === "image-crop" ||
          processingType === "canvas-extension") &&
        scale >= 2 &&
        originalDimensions
      ) {
        if (processingType === "image-crop" && parameters.cropArea) {
          const cropX = parameters.cropArea.x || 0;
          const cropY = parameters.cropArea.y || 0;
          const cropWidth = parameters.cropArea.width || 100;
          const cropHeight = parameters.cropArea.height || 100;

          console.log(
            "🔍 useImageProcessing - Sending raw coordinates for gallery replacement (backend will handle scaling):",
            {
              rawCoordinates: {
                x: cropX,
                y: cropY,
                width: cropWidth,
                height: cropHeight,
              },
              previewDimensions: originalDimensions,
              scale,
              processingType,
            }
          );
        } else if (processingType === "canvas-extension") {
          console.log(
            "🔍 useImageProcessing - Canvas extension gallery replacement with scaling:",
            {
              scale,
              previewDimensions: originalDimensions,
              processingType,
              desiredHeight: parameters.desiredHeight,
            }
          );
        }
      }

      console.log("🔍 useImageProcessing - Replace with scaled parameters:", {
        scale,
        originalParameters: parameters,
        scaledParameters,
        processingType,
      });

      const result = await replaceImageInGallery(
        galleryId,
        image._id,
        processingType,
        {
          ...scaledParameters,
          previewImageDimensions: originalDimensions, // Pass preview dimensions for backend coordinate scaling
        }
      );

      if (result && onImageReplaced) {
        console.log(
          "🎯 useImageProcessing - Gallery replacement successful, calling onImageReplaced:",
          {
            originalImageId: image._id,
            processedImage: result.processedImage,
            result,
          }
        );
        onImageReplaced(image._id, result.processedImage);
        handleReset();
      } else {
        console.log("❌ useImageProcessing - Gallery replacement issue:", {
          hasResult: !!result,
          hasOnImageReplaced: !!onImageReplaced,
          result,
        });
      }

      toast({
        title: "Success",
        description: `Image replaced in gallery with ${scale}x resolution`,
      });
    } catch (error) {
      console.error("Replace error:", error);
      toast({
        title: "Error",
        description: `Failed to replace image in gallery: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    }
  };

  const handleDiscardPreview = () => {
    setProcessedImage(null);
    setShowPreview(false);
  };

  const handleSaveToImages = async (scale: number = 1) => {
    if (!image || !canProcess) {
      toast({
        title: "Error",
        description: "Valid parameters required to save image",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProcessingStatus(`Processing ${scale}x image...`);

    try {
      if (!api) {
        throw new Error("Authentication required");
      }

      // SIMPLIFIED: Don't pre-scale dimensions, let the unified API handle it
      const scaledParameters = {
        ...parameters,
        scale,
        // Pass original dimensions - let backend handle scaling based on scaleMultiplier
        outputWidth: parameters.outputWidth,
        outputHeight: parameters.outputHeight,
        // For 2x+ processing, use higher resolution source
        sourceImageWidth: scale >= 2 ? 3000 : undefined,
        scaleMultiplier: scale, // Add explicit scale multiplier for backend
      };

      const result = await api.post<any>(`images/process`, {
        imageId: image._id,
        processingType,
        parameters: {
          ...scaledParameters,
          imageUrl: image.url,
          originalFilename: image.filename,
          originalCarId: image.carId,
          uploadToCloudflare: true,
          scaleMultiplier: scale, // Add scale multiplier for canvas extension
          previewImageDimensions: originalDimensions, // Add preview dimensions for coordinate scaling
        },
      });

      toast({
        title: "Success",
        description: `${scale}x image saved to collection successfully`,
      });

      setProcessingStatus("Image saved successfully");
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to save image";
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

  const handleDownloadLocal = async (scale: number = 1) => {
    console.log(
      "🚨🚨🚨 useImageProcessing.handleDownloadLocal CALLED 🚨🚨🚨",
      scale
    );

    if (!image || !canProcess) {
      toast({
        title: "Error",
        description: "Valid parameters required to download image",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProcessingStatus(`Generating ${scale}x download...`);

    try {
      // Create parameters with scale
      const scaledParameters = {
        ...parameters,
        scale,
        outputWidth:
          scale > 1
            ? String(parseInt(parameters.outputWidth || "1080") * scale)
            : parameters.outputWidth,
        outputHeight:
          scale > 1
            ? String(parseInt(parameters.outputHeight || "1920") * scale)
            : parameters.outputHeight,
      };

      // Call appropriate processing endpoint
      let endpoint: string;
      let payload: any;

      switch (processingType) {
        case "image-crop":
          endpoint = "/api/images/crop-image";

          // SIMPLIFIED APPROACH: Let the backend handle all scaling
          // Just pass the original parameters and scale multiplier
          const cropX = parameters.cropArea?.x || 0;
          const cropY = parameters.cropArea?.y || 0;
          const cropWidth = parameters.cropArea?.width || 100;
          const cropHeight = parameters.cropArea?.height || 100;

          console.log("🔍 useImageProcessing - SIMPLIFIED crop processing:", {
            scale,
            originalOutputDimensions: {
              width: parameters.outputWidth,
              height: parameters.outputHeight,
            },
            cropArea: { cropX, cropY, cropWidth, cropHeight },
            note: "Backend will handle all scaling logic",
          });

          payload = {
            imageUrl: image.url,
            cropX,
            cropY,
            cropWidth,
            cropHeight,
            outputWidth: parseInt(parameters.outputWidth) || 1080,
            outputHeight: parseInt(parameters.outputHeight) || 1920,
            scale: scale,
            uploadToCloudflare: false,
            sourceImageWidth: scale >= 2 ? 3000 : undefined, // Use highres variant for 2x+
            previewImageDimensions: originalDimensions,
            scaleMultiplier: scale, // Let backend handle output scaling
          };
          break;

        case "canvas-extension":
          endpoint = "/api/images/extend-canvas";

          // SIMPLIFIED: Apply scaling in direct API call (since it bypasses unified API)
          const baseDesiredHeight = parseInt(parameters.desiredHeight) || 1350;
          const baseRequestedWidth = parseInt(parameters.outputWidth) || 1080;

          console.log(
            "🔍 useImageProcessing - SIMPLIFIED canvas extension with scaling:",
            {
              originalDesiredHeight: parameters.desiredHeight,
              originalOutputWidth: parameters.outputWidth,
              scaledDesiredHeight: Math.round(baseDesiredHeight * scale),
              scaledRequestedWidth: Math.round(baseRequestedWidth * scale),
              scale,
              note: "Direct API call - applying scaling here",
            }
          );

          payload = {
            imageUrl: image.url,
            desiredHeight: Math.round(baseDesiredHeight * scale),
            paddingPct: parseFloat(parameters.paddingPercentage) || 0.05,
            whiteThresh: parseInt(parameters.whiteThreshold) || 90,
            uploadToCloudflare: false,
            requestedWidth: Math.round(baseRequestedWidth * scale),
            requestedHeight: Math.round(baseDesiredHeight * scale),
            scaleMultiplier: scale,
            previewImageDimensions: originalDimensions,
          };
          break;

        case "image-matte":
          endpoint = "/api/images/create-matte";
          payload = {
            imageUrl: image.url,
            canvasWidth: parseInt(scaledParameters.canvasWidth) || 1827,
            canvasHeight: parseInt(scaledParameters.canvasHeight) || 1080,
            paddingPercent: parseFloat(scaledParameters.paddingPercentage) || 0,
            matteColor: scaledParameters.matteColor || "#000000",
            uploadToCloudflare: false,
            requestedWidth: parseInt(scaledParameters.outputWidth) || 1080,
            requestedHeight: parseInt(scaledParameters.canvasHeight) || 1080,
          };
          break;

        default:
          throw new Error(`Unsupported processing type: ${processingType}`);
      }

      console.log("🚨🚨🚨 useImageProcessing - SENDING API REQUEST 🚨🚨🚨", {
        endpoint,
        method: "POST",
        payload: payload,
        processingType,
        scale,
        payloadKeys: Object.keys(payload),
      });

      const response = await fetch(endpoint, {
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

      console.log("🔍 useImageProcessing - API Response received:", {
        processingType,
        hasImageData: !!result.imageData,
        hasProcessedImageUrl: !!result.processedImageUrl,
        success: result.success,
        resultKeys: Object.keys(result),
      });

      // Handle different response formats based on processing type
      let downloadUrl: string;
      let hasData = false;

      if (result.imageData) {
        // Crop tool format - base64 string
        downloadUrl = `data:image/jpeg;base64,${result.imageData}`;
        hasData = true;
      } else if (result.processedImageUrl) {
        // Canvas extension format - already a data URL
        downloadUrl = result.processedImageUrl;
        hasData = true;
      } else {
        throw new Error("No image data received");
      }

      if (hasData) {
        // Create download link
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = `${image.filename || "processed"}_${processingType}${scale > 1 ? `_${scale}x` : ""}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log("✅ useImageProcessing - Download successful:", {
          processingType,
          filename: link.download,
          scale,
        });

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

  return {
    // State
    processedImage,
    showPreview,
    isProcessing,
    isUploading,
    isProcessingHighRes,
    highResMultiplier,
    processedImageUrl,
    highResImageUrl,
    originalDimensions,
    processedDimensions,
    highResDimensions,
    cloudflareResult,
    processingStatus,
    error,
    parameters,
    canProcess,
    isGalleryProcessing,
    isReplacing,

    // Setters
    setParameters,

    // Handlers
    handleProcess,
    handleHighResProcess,
    handleUploadToCloudflare,
    handleDownload,
    handleHighResDownload,
    handleViewInGallery,
    handleReset,
    handlePreview,
    handleReplaceImage,
    handleDiscardPreview,
    handleSaveToImages,
    handleDownloadLocal,
  };
}
