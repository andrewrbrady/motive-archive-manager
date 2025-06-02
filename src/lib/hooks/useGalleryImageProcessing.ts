import { useState } from "react";
import { toast } from "@/components/ui/use-toast";
import { useAPI } from "@/hooks/useAPI";

interface ProcessImageParams {
  galleryId: string;
  imageId: string;
  processingType: "canvas-extension" | "image-matte";
  parameters: any;
}

interface PreviewProcessImageResult {
  success: boolean;
  originalImage: {
    _id: string;
    url: string;
    filename: string;
    metadata: any;
    carId: string;
  };
  processedImage: {
    _id: string;
    url: string;
    filename: string;
    metadata: any;
    carId: string;
  };
  processingResult: any;
}

interface ReplaceImageResult {
  success: boolean;
  originalImageId: string;
  processedImage: {
    _id: string;
    url: string;
    filename: string;
    metadata: any;
    carId: string;
  };
  processingResult: any;
}

export function useGalleryImageProcessing() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  const api = useAPI();

  const previewProcessImage = async (
    params: ProcessImageParams
  ): Promise<PreviewProcessImageResult | null> => {
    if (!api) {
      toast({
        title: "Error",
        description: "Authentication required",
        variant: "destructive",
      });
      return null;
    }

    console.log("🔄 Gallery image processing starting:", {
      galleryId: params.galleryId,
      imageId: params.imageId,
      processingType: params.processingType,
      parametersPreview: {
        imageUrl: params.parameters.imageUrl?.substring(0, 100) + "...",
        processingMethod: params.parameters.processingMethod,
        desiredHeight: params.parameters.desiredHeight,
        paddingPct: params.parameters.paddingPct,
        whiteThresh: params.parameters.whiteThresh,
      },
    });

    setIsProcessing(true);

    try {
      const result = await api.post<PreviewProcessImageResult>(
        `galleries/${params.galleryId}/preview-process-image`,
        {
          imageId: params.imageId,
          processingType: params.processingType,
          parameters: params.parameters,
        }
      );

      console.log("✅ Gallery image processing succeeded:", {
        success: result.success,
        hasProcessedImage: !!result.processedImage,
        processedImageUrl:
          result.processedImage?.url?.substring(0, 100) + "...",
      });

      toast({
        title: "Preview Ready",
        description: "Image processed successfully. Review the preview below.",
      });

      return result;
    } catch (error) {
      // Enhanced error logging
      console.error("❌ Gallery image processing error details:", {
        error: error,
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        errorMessage: error instanceof Error ? error.message : "No message",
        errorStack: error instanceof Error ? error.stack : "No stack",
        errorStringified: JSON.stringify(error, null, 2),
        hasMessage: !!(error as any)?.message,
        hasStatus: !!(error as any)?.status,
        hasCode: !!(error as any)?.code,
        fullErrorObject: error,
        galleryId: params.galleryId,
        imageId: params.imageId,
        processingType: params.processingType,
      });

      let errorMessage = "Failed to process image";
      let detailedError = "";

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "object" && error !== null) {
        // Handle API error objects
        const apiError = error as any;
        if (apiError.message) {
          errorMessage = apiError.message;
        } else if (apiError.error) {
          errorMessage = apiError.error;
        } else if (apiError.status) {
          errorMessage = `Request failed with status ${apiError.status}`;
        }

        // Add detailed error info
        detailedError = JSON.stringify(error, null, 2);
      } else if (typeof error === "string") {
        errorMessage = error;
      }

      console.error("❌ Processed error message:", {
        finalErrorMessage: errorMessage,
        detailedError: detailedError,
      });

      toast({
        title: "Processing Error",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const replaceImageInGallery = async (
    galleryId: string,
    originalImageId: string,
    processingType: "canvas-extension" | "image-matte",
    parameters: any
  ): Promise<ReplaceImageResult | null> => {
    if (!api) {
      toast({
        title: "Error",
        description: "Authentication required",
        variant: "destructive",
      });
      return null;
    }

    setIsReplacing(true);

    try {
      const result = await api.post<ReplaceImageResult>(
        `galleries/${galleryId}/replace-image`,
        {
          originalImageId,
          processingType,
          parameters,
        }
      );

      toast({
        title: "Success",
        description: "Image processed and replaced in gallery successfully",
      });

      return result;
    } catch (error) {
      console.error("Gallery image replacement error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to replace image",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsReplacing(false);
    }
  };

  // Keep the old function for backward compatibility
  const processImage = async (
    params: ProcessImageParams
  ): Promise<any | null> => {
    if (!api) {
      toast({
        title: "Error",
        description: "Authentication required",
        variant: "destructive",
      });
      return null;
    }

    setIsProcessing(true);

    try {
      const result = await api.post<any>(
        `galleries/${params.galleryId}/process-image`,
        {
          imageId: params.imageId,
          processingType: params.processingType,
          parameters: params.parameters,
        }
      );

      toast({
        title: "Success",
        description: result.message || "Image processed successfully",
      });

      return result;
    } catch (error) {
      console.error("Gallery image processing error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to process image",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    previewProcessImage,
    replaceImageInGallery,
    processImage, // Keep for backward compatibility
    isProcessing,
    isReplacing,
  };
}
