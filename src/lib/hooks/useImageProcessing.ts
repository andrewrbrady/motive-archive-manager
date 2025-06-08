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

      // Apply the same coordinate scaling logic as download for crop operations
      // For gallery replacement, send raw coordinates to backend - let backend handle ALL scaling
      if (
        processingType === "image-crop" &&
        scale >= 2 &&
        originalDimensions &&
        parameters.cropArea
      ) {
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
        // For 2x+ processing, use higher resolution source
        sourceImageWidth: scale >= 2 ? 3000 : undefined,
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

          // Get the crop coordinates from parameters
          const cropX = scaledParameters.cropArea?.x || 0;
          const cropY = scaledParameters.cropArea?.y || 0;
          const cropWidth = scaledParameters.cropArea?.width || 100;
          const cropHeight = scaledParameters.cropArea?.height || 100;

          console.log(
            "🔍 useImageProcessing - Debug crop coordinates for scale:",
            scale,
            {
              originalCropArea: parameters.cropArea,
              scaledCropArea: scaledParameters.cropArea,
              originalDimensions,
              scale,
              imageUrl: image.url,
            }
          );

          // For 2x+ processing, we may need to scale coordinates
          // The coordinates in parameters.cropArea come from the canvas UI
          // They need to be scaled to match the high-resolution source image
          let finalCropX = cropX;
          let finalCropY = cropY;
          let finalCropWidth = cropWidth;
          let finalCropHeight = cropHeight;
          let sourceImageWidth = undefined;

          if (scale >= 2 && originalDimensions) {
            // Check if coordinates need scaling by examining if they're already in high-res space
            // If originalDimensions.width is already ~3000, coordinates are likely already correct
            const previewWidth = originalDimensions.width;
            const isAlreadyHighRes = previewWidth >= 2500; // If preview is already high-res

            if (isAlreadyHighRes) {
              // Coordinates are already in the correct high-resolution space, no scaling needed
              console.log(
                "🔍 useImageProcessing - Coordinates already in high-res space, no scaling needed:",
                {
                  cropArea: {
                    x: cropX,
                    y: cropY,
                    width: cropWidth,
                    height: cropHeight,
                  },
                  originalDimensions,
                  scale,
                  previewWidth,
                  reason: "previewWidth >= 2500px indicates high-res source",
                }
              );
              sourceImageWidth = previewWidth; // Use actual image width
            } else {
              // Coordinates are in preview space, need scaling to high-res
              const targetSourceWidth = 3000; // Target source resolution
              const scaleFactor = targetSourceWidth / previewWidth;

              // Apply scaling but use a slightly conservative factor to account for aspect ratio differences
              // The issue is that preview dimensions might not exactly match source aspect ratio
              const conservativeScaleFactor = scaleFactor * 0.999; // Reduce by 0.1% to prevent edge cases

              finalCropX = Math.round(cropX * conservativeScaleFactor);
              finalCropY = Math.round(cropY * conservativeScaleFactor);
              finalCropWidth = Math.round(cropWidth * conservativeScaleFactor);
              finalCropHeight = Math.round(
                cropHeight * conservativeScaleFactor
              );
              sourceImageWidth = targetSourceWidth;

              // Additional safety: ensure crop area doesn't exceed preview bounds when scaled
              const previewHeight = originalDimensions.height;
              const maxScaledHeight = Math.round(previewHeight * scaleFactor);
              if (finalCropY + finalCropHeight > maxScaledHeight) {
                const excess = finalCropY + finalCropHeight - maxScaledHeight;
                finalCropHeight = Math.max(100, finalCropHeight - excess); // Ensure minimum height
                console.log(
                  "🔧 Adjusted crop height to fit source aspect ratio:",
                  {
                    originalScaledHeight: Math.round(cropHeight * scaleFactor),
                    adjustedHeight: finalCropHeight,
                    excessPixels: excess,
                    maxScaledHeight,
                  }
                );
              }

              console.log(
                "🔍 useImageProcessing - Coordinate scaling applied:",
                {
                  original: {
                    x: cropX,
                    y: cropY,
                    width: cropWidth,
                    height: cropHeight,
                  },
                  scaled: {
                    x: finalCropX,
                    y: finalCropY,
                    width: finalCropWidth,
                    height: finalCropHeight,
                  },
                  scaleFactor,
                  previewWidth,
                  targetSourceWidth,
                  scale,
                }
              );
            }
          } else {
            console.log(
              "🔍 useImageProcessing - No coordinate scaling for 1x:",
              {
                cropArea: {
                  x: cropX,
                  y: cropY,
                  width: cropWidth,
                  height: cropHeight,
                },
                scale,
                originalDimensions,
              }
            );
          }

          payload = {
            imageUrl: image.url,
            cropX: finalCropX,
            cropY: finalCropY,
            cropWidth: finalCropWidth,
            cropHeight: finalCropHeight,
            outputWidth: parseInt(scaledParameters.outputWidth) || 1080,
            outputHeight: parseInt(scaledParameters.outputHeight) || 1920,
            scale: scaledParameters.scale || 1.0,
            uploadToCloudflare: false,
            sourceImageWidth: sourceImageWidth,
          };
          break;

        case "canvas-extension":
          endpoint = "/api/images/extend-canvas";
          payload = {
            imageUrl: image.url,
            desiredHeight: parseInt(scaledParameters.desiredHeight) || 1350,
            paddingPct: parseFloat(scaledParameters.paddingPercentage) || 0.05,
            whiteThresh: parseInt(scaledParameters.whiteThreshold) || 90,
            uploadToCloudflare: false,
            requestedWidth: parseInt(scaledParameters.outputWidth) || 1080,
            requestedHeight: parseInt(scaledParameters.desiredHeight) || 1350,
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

      if (result.imageData) {
        // Create download link
        const link = document.createElement("a");
        link.href = `data:image/jpeg;base64,${result.imageData}`;
        link.download = `${image.filename || "processed"}_${processingType}${scale > 1 ? `_${scale}x` : ""}.jpg`;
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
