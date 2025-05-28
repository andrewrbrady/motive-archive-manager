import React from "react";
import { Label } from "@/components/ui/label";
import { CloudflareImage } from "@/components/ui/CloudflareImage";
import { Loader2, CheckCircle } from "lucide-react";
import { ImageDimensions, CloudflareUploadResult } from "../types";

interface ImagePreviewProps {
  // Live preview
  livePreviewEnabled: boolean;
  isGeneratingPreview: boolean;
  livePreviewUrl: string | null;
  previewProcessingTime: number | null;

  // Processed images
  processedImageUrl: string | null;
  processedDimensions: ImageDimensions | null;
  highResImageUrl: string | null;
  highResDimensions: ImageDimensions | null;

  // Upload result
  cloudflareResult: CloudflareUploadResult | null;
}

export function ImagePreview({
  livePreviewEnabled,
  isGeneratingPreview,
  livePreviewUrl,
  previewProcessingTime,
  processedImageUrl,
  processedDimensions,
  highResImageUrl,
  highResDimensions,
  cloudflareResult,
}: ImagePreviewProps) {
  return (
    <div className="space-y-4">
      {/* Live Preview */}
      {livePreviewEnabled && (
        <div className="space-y-2">
          <Label>Live Preview</Label>
          <div className="border rounded-lg p-2 bg-muted/50">
            {isGeneratingPreview ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Generating preview...
                </span>
              </div>
            ) : livePreviewUrl ? (
              <>
                <CloudflareImage
                  src={livePreviewUrl}
                  alt="Live preview"
                  width={200}
                  height={200}
                  className="w-full h-auto max-h-48 object-contain rounded"
                  variant="medium"
                />
                {previewProcessingTime && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Generated in {previewProcessingTime}ms
                  </p>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <span className="text-sm">Adjust settings to see preview</span>
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
            <CloudflareImage
              src={processedImageUrl}
              alt="Processed image"
              width={200}
              height={200}
              className="w-full h-auto max-h-48 object-contain rounded"
              variant="medium"
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
            <CloudflareImage
              src={highResImageUrl}
              alt="High-res processed image"
              width={200}
              height={200}
              className="w-full h-auto max-h-48 object-contain rounded"
              variant="large"
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
              <span className="text-sm font-medium">Upload Successful</span>
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
  );
}
