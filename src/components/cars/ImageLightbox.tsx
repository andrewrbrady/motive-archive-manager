import React from "react";
import Image from "next/image";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Copy, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";

interface ImageLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  image: {
    _id: string;
    url: string;
    filename: string;
    metadata: {
      angle?: string;
      movement?: string;
      tod?: string;
      view?: string;
      description?: string;
    };
    createdAt: string;
    updatedAt: string;
  } | null;
}

export function ImageLightbox({ isOpen, onClose, image }: ImageLightboxProps) {
  if (!image) return null;

  const copyUrl = () => {
    navigator.clipboard.writeText(image.url);
  };

  const openInNewTab = () => {
    window.open(image.url, "_blank");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-full bg-background">
        <div className="relative flex flex-col space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h2 className="text-xl font-semibold tracking-tight">
              {image.filename}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Image */}
          <div className="relative w-full h-[60vh] bg-muted rounded-lg overflow-hidden">
            <Image
              src={image.url}
              alt={image.filename}
              fill
              className="object-contain"
              priority
            />
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Image Details
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Filename:</span>
                  <span>{image.filename}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span>{formatDate(new Date(image.createdAt))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Updated:</span>
                  <span>{formatDate(new Date(image.updatedAt))}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Metadata
              </h3>
              <div className="space-y-2 text-sm">
                {Object.entries(image.metadata || {}).map(
                  ([key, value]) =>
                    value &&
                    typeof value !== "object" && (
                      <div key={key} className="flex justify-between">
                        <span className="text-muted-foreground capitalize">
                          {key}:
                        </span>
                        <span>{value}</span>
                      </div>
                    )
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t border-border">
            <Button variant="outline" size="sm" onClick={copyUrl}>
              <Copy className="h-4 w-4 mr-2" />
              Copy URL
            </Button>
            <Button variant="outline" size="sm" onClick={openInNewTab}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Full Size
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
