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

      toast({
        title: "Preview Ready",
        description: "Image processed successfully. Review the preview below.",
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
