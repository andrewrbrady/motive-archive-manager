import React from "react";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Car, CheckCircle, XCircle } from "lucide-react";
import { ProcessableImageData } from "@/components/ui/image-processing/types";

interface CloudflareUploadResult {
  success: boolean;
  imageId?: string;
  imageUrl?: string;
  filename?: string;
  mongoId?: string;
  error?: string;
}

interface ImageProcessingModalHeaderProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  image: ProcessableImageData | null;
  processingStatus?: string;
  error?: string | null;
  cloudflareResult?: CloudflareUploadResult | null;
}

export function ImageProcessingModalHeader({
  icon,
  title,
  description,
  image,
  processingStatus,
  error,
  cloudflareResult,
}: ImageProcessingModalHeaderProps) {
  return (
    <>
      <DialogHeader className="flex-shrink-0">
        <DialogTitle className="flex items-center gap-2">
          {icon}
          {title}
        </DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>

      {/* Car Association Indicator */}
      {image?.carId && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Car className="h-4 w-4 text-blue-600" />
          <span className="text-sm text-blue-700">
            This image is associated with a car. Processed images will be linked
            to the same car.
          </span>
        </div>
      )}

      {/* Processing Status */}
      {processingStatus && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">{processingStatus}</p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <XCircle className="h-4 w-4 text-red-600" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {/* Success Display */}
      {cloudflareResult?.success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className="text-sm text-green-700">
            Image uploaded successfully! You can now view it in the gallery.
          </span>
        </div>
      )}
    </>
  );
}
