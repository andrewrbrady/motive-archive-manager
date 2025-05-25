import React, { useState, useEffect } from "react";
import LazyImage from "@/components/LazyImage";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ZoomIn, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface ImageData {
  _id: string;
  url: string;
  metadata?: {
    category?: string;
    description?: string;
    isPrimary?: boolean;
    [key: string]: any;
  };
  filename?: string;
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface CarImageGalleryProps {
  images: ImageData[];
  pagination?: PaginationData;
  onPageChange?: (page: number) => void;
  className?: string;
  thumbnailSize?: { width: number; height: number };
  fullSize?: { width: number; height: number };
  showCategoryTabs?: boolean;
  onImageClick?: (image: ImageData) => void;
  isLoading?: boolean;
}

const CarImageGallery: React.FC<CarImageGalleryProps> = ({
  images = [],
  pagination,
  onPageChange,
  className = "",
  thumbnailSize = { width: 150, height: 100 },
  fullSize = { width: 800, height: 600 },
  showCategoryTabs = true,
  onImageClick,
  isLoading = false,
}) => {
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [currentTab, setCurrentTab] = useState("all");
  const [filteredImages, setFilteredImages] = useState<ImageData[]>(images);

  useEffect(() => {
    if (currentTab === "all") {
      setFilteredImages(images);
    } else {
      setFilteredImages(
        images.filter((img) => img.metadata?.category === currentTab)
      );
    }
  }, [images, currentTab]);

  const handleImageClick = (image: ImageData) => {
    setSelectedImage(image);
    setShowImageDialog(true);
    if (onImageClick) {
      onImageClick(image);
    }
  };

  const handleCloseDialog = () => {
    setShowImageDialog(false);
  };

  const handlePageChange = (page: number) => {
    if (onPageChange) {
      onPageChange(page);
    }
  };

  const navigateImages = (direction: "next" | "prev") => {
    if (!selectedImage) return;

    const currentIndex = filteredImages.findIndex(
      (img) => img._id === selectedImage._id
    );
    if (currentIndex === -1) return;

    let newIndex;
    if (direction === "next") {
      newIndex = (currentIndex + 1) % filteredImages.length;
    } else {
      newIndex =
        (currentIndex - 1 + filteredImages.length) % filteredImages.length;
    }

    setSelectedImage(filteredImages[newIndex]);
  };

  // Extract unique categories from images
  const categories = [
    "all",
    ...Array.from(
      new Set(
        images.map((img) => img.metadata?.category).filter(Boolean) as string[]
      )
    ),
  ];

  if (isLoading) {
    return (
      <div
        className={cn(
          "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4",
          className
        )}
      >
        {Array.from({ length: 8 }).map((_, index) => (
          <LazyImage
            key={`skeleton-${index}`}
            src=""
            alt="Loading"
            width={thumbnailSize.width}
            height={thumbnailSize.height}
            loadingVariant="skeleton"
          />
        ))}
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col h-[400px] items-center justify-center gap-4">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <ZoomIn className="h-12 w-12 mb-2" />
          <p className="text-lg font-medium">No images yet</p>
          <p className="text-sm">Add images to see them here</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {showCategoryTabs && categories.length > 1 && (
        <Tabs
          defaultValue="all"
          value={currentTab}
          onValueChange={setCurrentTab}
          className="mb-4"
        >
          <TabsList>
            {categories.map((category) => (
              <TabsTrigger
                key={category}
                value={category}
                className="capitalize"
              >
                {category}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredImages.map((image) => (
          <div key={image._id} className="relative group cursor-pointer">
            <LazyImage
              src={image.url}
              alt={image.metadata?.description || image.filename || "Car image"}
              width={thumbnailSize.width}
              height={thumbnailSize.height}
              className="rounded-md"
              onClick={() => handleImageClick(image)}
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <Button
                variant="ghost"
                size="icon"
                className="bg-white bg-opacity-70 hover:bg-opacity-100"
                onClick={() => handleImageClick(image)}
              >
                <ZoomIn className="w-5 h-5" />
              </Button>
            </div>
            {image.metadata?.isPrimary && (
              <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                Primary
              </div>
            )}
          </div>
        ))}
      </div>

      {pagination && pagination.pages > 1 && (
        <div className="mt-4 flex justify-center items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>

          <span className="text-sm">
            Page {pagination.page} of {pagination.pages}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.pages}
          >
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="max-w-4xl w-full p-1 sm:p-6">
          <DialogTitle className="flex justify-between items-center">
            <span>
              {selectedImage?.metadata?.description ||
                selectedImage?.filename ||
                "Image"}
            </span>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" onClick={handleCloseDialog}>
                <X className="w-5 h-5" />
              </Button>
            </DialogClose>
          </DialogTitle>

          <div className="relative flex justify-center items-center">
            {selectedImage && (
              <LazyImage
                src={selectedImage.url}
                alt={
                  selectedImage.metadata?.description ||
                  selectedImage.filename ||
                  "Car image"
                }
                width={fullSize.width}
                height={fullSize.height}
                objectFit="contain"
                className="rounded-md"
              />
            )}

            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 p-1 bg-white/70 hover:bg-white/90 rounded-full"
              onClick={() => navigateImages("prev")}
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 p-1 bg-white/70 hover:bg-white/90 rounded-full"
              onClick={() => navigateImages("next")}
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          </div>

          {selectedImage?.metadata && (
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              {Object.entries(selectedImage.metadata)
                .filter(([key]) => key !== "isPrimary")
                .map(([key, value]) => (
                  <div key={key} className="flex">
                    <span className="font-medium capitalize mr-2">{key}:</span>
                    <span>{String(value)}</span>
                  </div>
                ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CarImageGallery;
