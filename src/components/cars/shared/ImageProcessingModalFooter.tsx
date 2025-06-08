import React from "react";
import { DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Download,
  Upload,
  ExternalLink,
  Check,
  RotateCcw,
  Save,
  Replace,
  Zap,
} from "lucide-react";

interface CloudflareUploadResult {
  success: boolean;
  imageId?: string;
  imageUrl?: string;
  filename?: string;
  mongoId?: string;
  error?: string;
}

interface ProcessedImageData {
  _id: string;
  url: string;
  filename: string;
  metadata: any;
  carId: string;
}

interface ImageProcessingModalFooterProps {
  // Gallery mode props
  enablePreview?: boolean;
  galleryId?: string;
  showPreview: boolean;
  processedImage: ProcessedImageData | null;
  isGalleryProcessing: boolean;
  isReplacing: boolean;

  // Processing state
  isProcessing: boolean;
  isProcessingHighRes: boolean;
  highResMultiplier: number | null;
  isUploading: boolean;

  // URLs and results
  processedImageUrl: string | null;
  highResImageUrl: string | null;
  cloudflareResult: CloudflareUploadResult | null;

  // New streamlined handlers
  onReplaceImage: (scale?: number) => void;
  onSaveToImages: (scale?: number) => void;
  onDownloadLocal: (scale?: number) => void;
  onReset: () => void;
  onClose: () => void;

  // Validation
  canProcess: boolean;

  // Custom process button content
  processButtonContent: {
    idle: { icon: React.ReactNode; text: string };
    processing: { text: string };
  };
}

export function ImageProcessingModalFooter({
  enablePreview,
  galleryId,
  isProcessing,
  onReplaceImage,
  onSaveToImages,
  onDownloadLocal,
  onReset,
  onClose,
  canProcess,
}: ImageProcessingModalFooterProps) {
  return (
    <DialogFooter className="flex flex-wrap gap-2 flex-shrink-0 border-t pt-4">
      <div className="flex gap-2 flex-wrap">
        {/* Primary Actions */}
        {enablePreview && galleryId && (
          <Button
            onClick={() => onReplaceImage(1)}
            disabled={isProcessing || !canProcess}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Replace className="mr-2 h-4 w-4" />
                Replace in Gallery
              </>
            )}
          </Button>
        )}

        <Button
          onClick={() => onSaveToImages(1)}
          disabled={isProcessing || !canProcess}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save to Images
            </>
          )}
        </Button>

        <Button
          onClick={() => onDownloadLocal(1)}
          disabled={isProcessing || !canProcess}
          variant="outline"
          className="border-gray-300 hover:bg-gray-50"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Download
            </>
          )}
        </Button>

        {/* Secondary Actions - High Resolution */}
        <div className="border-l pl-2 ml-2 flex gap-2">
          {/* 2x Gallery Replace - only show if gallery context exists */}
          {enablePreview && galleryId && (
            <Button
              onClick={() => onReplaceImage(2)}
              disabled={isProcessing || !canProcess}
              variant="outline"
              size="sm"
              className="border-green-300 hover:bg-green-50 text-green-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  2x...
                </>
              ) : (
                <>
                  <Zap className="mr-1 h-3 w-3" />
                  2x Gallery
                </>
              )}
            </Button>
          )}

          <Button
            onClick={() => onDownloadLocal(2)}
            disabled={isProcessing || !canProcess}
            variant="outline"
            size="sm"
            className="border-amber-300 hover:bg-amber-50 text-amber-700"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                2x...
              </>
            ) : (
              <>
                <Zap className="mr-1 h-3 w-3" />
                2x Local
              </>
            )}
          </Button>

          <Button
            onClick={() => onSaveToImages(2)}
            disabled={isProcessing || !canProcess}
            variant="outline"
            size="sm"
            className="border-amber-300 hover:bg-amber-50 text-amber-700"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                2x...
              </>
            ) : (
              <>
                <Zap className="mr-1 h-3 w-3" />
                2x Images
              </>
            )}
          </Button>
        </div>

        {/* Utility Actions */}
        <div className="border-l pl-2 ml-2 flex gap-2">
          <Button variant="outline" onClick={onReset} size="sm">
            <RotateCcw className="mr-1 h-3 w-3" />
            Reset
          </Button>
        </div>
      </div>

      <Button variant="outline" onClick={onClose}>
        Close
      </Button>
    </DialogFooter>
  );
}
