"use client";

import React, { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Images } from "lucide-react";

interface ImageType {
  id: string;
  src: string;
  alt: string;
}

interface FullWidthGalleryProps {
  images: ImageType[];
  className?: string;
  cols?: {
    sm?: number;
    md?: number;
    lg?: number;
  };
}

const getGridColsClass = (cols: { sm?: number; md?: number; lg?: number }) => {
  const colClasses = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
    6: "grid-cols-6",
  };

  const mdColClasses = {
    1: "md:grid-cols-1",
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
    4: "md:grid-cols-4",
    6: "md:grid-cols-6",
  };

  const lgColClasses = {
    1: "lg:grid-cols-1",
    2: "lg:grid-cols-2",
    3: "lg:grid-cols-3",
    4: "lg:grid-cols-4",
    6: "lg:grid-cols-6",
  };

  return cn(
    colClasses[cols.sm as keyof typeof colClasses] || "grid-cols-1",
    mdColClasses[cols.md as keyof typeof mdColClasses] || "md:grid-cols-3",
    lgColClasses[cols.lg as keyof typeof lgColClasses] || "lg:grid-cols-3"
  );
};

const FullWidthGallery: React.FC<FullWidthGalleryProps> = ({
  images,
  className = "",
  cols = { sm: 1, md: 3, lg: 3 },
}) => {
  const [loadingImages, setLoadingImages] = useState<{
    [key: string]: boolean;
  }>(images.reduce((acc, img) => ({ ...acc, [img.id]: true }), {}));

  const [loadErrors, setLoadErrors] = useState<Record<string, boolean>>({});

  const handleImageLoad = (id: string) => {
    setLoadingImages((prev) => ({ ...prev, [id]: false }));
  };

  const handleImageError = (imageId: string) => {
    setLoadErrors((prev) => ({ ...prev, [imageId]: true }));
  };

  const openModal = (id: string) => {
    const dialog = document.getElementById(id) as HTMLDialogElement;
    if (dialog) {
      dialog.showModal();

      const handleKeyPress = (e: KeyboardEvent) => {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          navigateModal(id, "next");
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          navigateModal(id, "prev");
        } else if (e.key === "Escape") {
          e.preventDefault();
          dialog.close();
        }
      };

      window.addEventListener("keydown", handleKeyPress);
      dialog.addEventListener("close", () => {
        window.removeEventListener("keydown", handleKeyPress);
      });
    }
  };

  const closeModal = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName.toLowerCase() === "dialog" ||
      target.classList.contains("close-btn")
    ) {
      const dialog = target.closest("dialog");
      if (dialog) dialog.close();
    }
  };

  const navigateModal = (currentId: string, direction: "next" | "prev") => {
    const currentIndex = images.findIndex((img) => img.id === currentId);
    let nextIndex;

    if (direction === "next") {
      nextIndex = (currentIndex + 1) % images.length;
    } else {
      nextIndex = (currentIndex - 1 + images.length) % images.length;
    }

    const currentDialog = document.getElementById(
      currentId
    ) as HTMLDialogElement;
    const nextDialog = document.getElementById(
      images[nextIndex].id
    ) as HTMLDialogElement;

    if (currentDialog && nextDialog) {
      currentDialog.close();
      nextDialog.showModal();
    }
  };

  if (!images || images.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "-mx-4 sm:-mx-6 md:-mx-8 lg:-mx-12 xl:-mx-16 my-8",
        className
      )}
    >
      <div
        className={cn("grid gap-4 p-4 sm:p-6 md:p-8", getGridColsClass(cols))}
      >
        {images.map((image) => (
          <div key={image.id} className="relative aspect-video">
            {!loadErrors[image.id] ? (
              <img
                src={image.src}
                alt={image.alt}
                onError={() => handleImageError(image.id)}
                className="absolute inset-0 w-full h-full object-cover rounded-lg"
                loading="lazy"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg">
                <div className="flex flex-col items-center gap-2">
                  <Images className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Image not available
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FullWidthGallery;
