"use client";

import React, { useState } from "react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GalleryImage {
  id: string;
  src: string;
  alt: string;
}

interface GalleryProps {
  images: GalleryImage[];
  className?: string;
}

export default function Gallery({ images, className }: GalleryProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null
  );
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [errorImages, setErrorImages] = useState<Set<string>>(new Set());

  const handleImageLoad = (imageId: string) => {
    setLoadedImages((prev) => new Set([...prev, imageId]));
  };

  const handleImageError = (imageId: string) => {
    setErrorImages((prev) => new Set([...prev, imageId]));
  };

  const handlePrevious = () => {
    if (selectedImageIndex === null) return;
    setSelectedImageIndex(
      selectedImageIndex === 0 ? images.length - 1 : selectedImageIndex - 1
    );
  };

  const handleNext = () => {
    if (selectedImageIndex === null) return;
    setSelectedImageIndex(
      selectedImageIndex === images.length - 1 ? 0 : selectedImageIndex + 1
    );
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const activeDialog = document.querySelector(
        "dialog[open]"
      ) as HTMLDialogElement;
      if (!activeDialog) return;

      const currentId = activeDialog.id;
      const currentIndex = images.findIndex((img) => img.id === currentId);

      if (e.key === "ArrowRight") {
        const nextIndex = (currentIndex + 1) % images.length;
        activeDialog.close();
        const nextDialog = document.getElementById(
          images[nextIndex].id
        ) as HTMLDialogElement;
        if (nextDialog) nextDialog.showModal();
      } else if (e.key === "ArrowLeft") {
        const prevIndex = (currentIndex - 1 + images.length) % images.length;
        activeDialog.close();
        const prevDialog = document.getElementById(
          images[prevIndex].id
        ) as HTMLDialogElement;
        if (prevDialog) prevDialog.showModal();
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [images]);

  if (!images.length) {
    return (
      <div className="w-full aspect-video bg-muted rounded-lg flex items-center justify-center">
        <span className="text-muted-foreground">No images available</span>
      </div>
    );
  }

  return (
    <>
      <div className={cn("grid grid-cols-2 md:grid-cols-3 gap-4", className)}>
        {images.map((image, index) => (
          <div
            key={image.id}
            className="relative aspect-video cursor-pointer group"
            onClick={() => setSelectedImageIndex(index)}
          >
            {!loadedImages.has(image.id) && !errorImages.has(image.id) && (
              <div className="absolute inset-0 bg-muted animate-pulse rounded-lg" />
            )}
            {errorImages.has(image.id) ? (
              <div className="absolute inset-0 bg-muted rounded-lg flex items-center justify-center">
                <span className="text-muted-foreground text-sm">
                  Failed to load image
                </span>
              </div>
            ) : (
              <img
                src={image.src}
                alt={image.alt}
                className={cn(
                  "w-full h-full object-cover rounded-lg transition-opacity duration-300",
                  !loadedImages.has(image.id) && "opacity-0",
                  "group-hover:opacity-90"
                )}
                onLoad={() => handleImageLoad(image.id)}
                onError={() => handleImageError(image.id)}
              />
            )}
          </div>
        ))}
      </div>

      <Dialog
        open={selectedImageIndex !== null}
        onOpenChange={() => setSelectedImageIndex(null)}
      >
        <DialogContent className="max-w-7xl w-full h-[90vh] p-0 gap-0">
          <div className="relative w-full h-full flex items-center justify-center bg-background/95 backdrop-blur-sm">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-50"
              onClick={() => setSelectedImageIndex(null)}
            >
              <X className="h-4 w-4" />
            </Button>

            {selectedImageIndex !== null && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2"
                  onClick={handlePrevious}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="w-full h-full flex items-center justify-center p-8">
                  {errorImages.has(images[selectedImageIndex].id) ? (
                    <div className="text-muted-foreground">
                      Failed to load image
                    </div>
                  ) : (
                    <img
                      src={images[selectedImageIndex].src}
                      alt={images[selectedImageIndex].alt}
                      className="max-w-full max-h-full object-contain"
                      onError={() =>
                        handleImageError(images[selectedImageIndex].id)
                      }
                    />
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                  onClick={handleNext}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        dialog {
          width: 100vw;
          height: 100vh;
          max-width: 100vw;
          max-height: 100vh;
        }
        dialog::backdrop {
          background: rgba(0, 0, 0, 0.9);
        }
        dialog[open] {
          display: block;
        }
      `}</style>
    </>
  );
}
