import React from "react";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Download,
  Upload,
  ExternalLink,
  RotateCcw,
  Crop,
  ZoomIn,
} from "lucide-react";
import { CropArea, ImageDimensions, CloudflareUploadResult } from "../types";

interface ProcessingButtonsProps {
  // State
  isProcessing: boolean;
  isProcessingHighRes: boolean;
  isUploading: boolean;
  highResMultiplier: number | null;

  // Image data
  image: { url: string } | null;
  originalDimensions: ImageDimensions | null;
  cropArea: CropArea;
  processedImageUrl: string | null;
  highResImageUrl: string | null;
  cloudflareResult: CloudflareUploadResult | null;

  // Validation
  validateCropArea: (area: CropArea, dimensions: ImageDimensions) => boolean;

  // Handlers
  onProcess: () => void;
  onHighResProcess: (multiplier: 2 | 4) => void;
  onDownload: () => void;
  onHighResDownload: () => void;
  onUploadToCloudflare: () => void;
  onViewInGallery: () => void;
  onReset: () => void;
  onClose: () => void;
}

export function ProcessingButtons({
  isProcessing,
  isProcessingHighRes,
  isUploading,
  highResMultiplier,
  image,
  originalDimensions,
  cropArea,
  processedImageUrl,
  highResImageUrl,
  cloudflareResult,
  validateCropArea,
  onProcess,
  onHighResProcess,
  onDownload,
  onHighResDownload,
  onUploadToCloudflare,
  onViewInGallery,
  onReset,
  onClose,
}: ProcessingButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <div className="flex gap-2 flex-wrap">
        {/* Process Button */}
        <Button
          onClick={onProcess}
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
              onClick={() => onHighResProcess(2)}
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
              onClick={() => onHighResProcess(4)}
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
          <Button variant="outline" onClick={onDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        )}

        {highResImageUrl && (
          <Button variant="outline" onClick={onHighResDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download High-Res
          </Button>
        )}

        {/* Upload Button */}
        {(processedImageUrl || highResImageUrl) && !cloudflareResult && (
          <Button
            variant="outline"
            onClick={onUploadToCloudflare}
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
          <Button variant="outline" onClick={onViewInGallery}>
            <ExternalLink className="mr-2 h-4 w-4" />
            View in Gallery
          </Button>
        )}

        {/* Reset Button */}
        <Button variant="outline" onClick={onReset}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset
        </Button>
      </div>

      <Button variant="outline" onClick={onClose}>
        Close
      </Button>
    </div>
  );
}
