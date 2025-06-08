import React from "react";
import { Label } from "@/components/ui/label";
import { Eye } from "lucide-react";
import Image from "next/image";

interface ImageDimensions {
  width: number;
  height: number;
}

interface ProcessedImageData {
  _id: string;
  url: string;
  filename: string;
  metadata: any;
  carId: string;
}

interface ImageDisplayWindowProps {
  title: string;
  imageUrl?: string | null;
  altText: string;
  dimensions?: ImageDimensions | null;
  loadError: boolean;
  onError: (e: any) => void;
  onLoad: (e: any) => void;
  fallbackContent?: React.ReactNode;
  children?: React.ReactNode;
  showGalleryPreview?: boolean;
  galleryPreviewImage?: ProcessedImageData | null;
  className?: string;
}

export function ImageDisplayWindow({
  title,
  imageUrl,
  altText,
  dimensions,
  loadError,
  onError,
  onLoad,
  fallbackContent,
  children,
  showGalleryPreview,
  galleryPreviewImage,
  className = "",
}: ImageDisplayWindowProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">{title}</Label>
          {dimensions && (
            <span className="text-xs text-muted-foreground">
              {dimensions.width} × {dimensions.height}
            </span>
          )}
        </div>

        <div className="mt-2 border rounded-lg overflow-hidden bg-muted flex items-center justify-center min-h-[300px]">
          {imageUrl ? (
            <div className="relative max-w-full max-h-[600px]">
              {!loadError ? (
                <Image
                  src={imageUrl}
                  alt={altText}
                  width={0}
                  height={0}
                  sizes="100vw"
                  className="w-auto h-auto max-w-full max-h-[600px] object-contain"
                  style={{ width: "auto", height: "auto" }}
                  onError={onError}
                  onLoad={onLoad}
                  unoptimized={!imageUrl.includes("imagedelivery.net")}
                />
              ) : (
                <img
                  src={imageUrl}
                  alt={altText}
                  className="w-auto h-auto max-w-full max-h-[600px] object-contain"
                  style={{ width: "auto", height: "auto" }}
                  onError={onError}
                  onLoad={onLoad}
                />
              )}
              {children}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              {fallbackContent || (
                <div className="text-center">
                  <Eye className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">No image available</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Gallery Preview Image */}
        {showGalleryPreview && galleryPreviewImage && (
          <div className="space-y-2 mt-4">
            <Label>Gallery Preview</Label>
            <div className="border rounded-lg p-2 bg-blue-50 border-blue-200">
              <Image
                src={galleryPreviewImage.url}
                alt="Gallery processed image"
                width={200}
                height={200}
                className="w-full h-auto max-h-32 object-contain rounded"
                unoptimized={true}
              />
              <div className="mt-2 space-y-1">
                <p className="text-xs text-blue-700 font-medium">
                  Ready to replace in gallery
                </p>
                <p className="text-xs text-blue-600">
                  Filename: {galleryPreviewImage.filename}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
