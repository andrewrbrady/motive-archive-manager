import { useState } from "react";
import { toast } from "@/components/ui/use-toast";

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

  const previewProcessImage = async (
    params: ProcessImageParams
  ): Promise<PreviewProcessImageResult | null> => {
    setIsProcessing(true);

    try {
      const response = await fetch(
        `/api/galleries/${params.galleryId}/preview-process-image`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageId: params.imageId,
            processingType: params.processingType,
            parameters: params.parameters,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process image");
      }

      const result = await response.json();

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
    setIsReplacing(true);

    try {
      const response = await fetch(
        `/api/galleries/${galleryId}/replace-image`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            originalImageId,
            processingType,
            parameters,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to replace image");
      }

      const result = await response.json();

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
    setIsProcessing(true);

    try {
      const response = await fetch(
        `/api/galleries/${params.galleryId}/process-image`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageId: params.imageId,
            processingType: params.processingType,
            parameters: params.parameters,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process image");
      }

      const result = await response.json();

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
