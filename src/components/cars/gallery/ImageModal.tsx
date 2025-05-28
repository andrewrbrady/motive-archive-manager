import React from "react";
import { CloudflareImage } from "@/components/ui/CloudflareImage";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { ExtendedImageType, getUrlVariations } from "@/types/gallery";

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentImage: ExtendedImageType | undefined;
}

export function ImageModal({ isOpen, onClose, currentImage }: ImageModalProps) {
  if (!currentImage) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-0">
        <DialogTitle className="sr-only">Full size image view</DialogTitle>
        <div className="relative w-full h-[90vh] bg-black">
          <CloudflareImage
            src={getUrlVariations(currentImage.url).w2000}
            alt={currentImage.metadata?.description || "Full size image"}
            fill
            className="object-contain"
            sizes="95vw"
          />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors z-10"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
