"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Loader2, ImageIcon, RefreshCw, Plus, X, Search } from "lucide-react";
import { CloudflareImage } from "@/components/ui/CloudflareImage";

interface GalleryImageProps {
  image: any;
  index: number;
  onAddImage: (imageUrl: string, altText?: string, imageObject?: any) => void;
}

/**
 * GalleryImage - Optimized lazy-loaded image component for gallery popup
 * Performance optimization: Prevents unnecessary re-renders with React.memo
 * and adds intersection observer for lazy loading
 */
const GalleryImage = React.memo<GalleryImageProps>(function GalleryImage({
  image,
  index,
  onAddImage,
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);

  // Intersection Observer for lazy loading
  const imgRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        },
        { rootMargin: "50px" }
      );
      observer.observe(node);
      return () => observer.disconnect();
    }
    return undefined;
  }, []);

  const handleImageError = useCallback(() => {
    console.error("❌ Image failed to load:", {
      src: image.imageUrl,
      alt: image.alt,
      galleryName: image.galleryName,
      originalUrl: image.url,
    });
    setHasError(true);
  }, [image]);

  const handleImageLoad = useCallback(() => {
    console.log("✅ Image loaded successfully:", {
      src: image.imageUrl,
      galleryName: image.galleryName,
    });
    setIsLoaded(true);
  }, [image]);

  const handleClick = useCallback(() => {
    onAddImage(image.imageUrl, image.alt, image);
  }, [image, onAddImage]);

  return (
    <div
      ref={imgRef}
      className="relative group cursor-pointer rounded-lg overflow-hidden border border-border/40 hover:border-border/60 transition-all"
      onClick={handleClick}
      title={`${image.alt} - ${image.galleryName}`}
    >
      {/* Lazy loading placeholder */}
      {!isInView ? (
        <div className="w-full aspect-[4/3] bg-muted/10 flex items-center justify-center">
          <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
        </div>
      ) : (
        <>
          {hasError ? (
            <div className="w-full aspect-[4/3] bg-muted/20 flex items-center justify-center">
              <span className="text-xs text-muted-foreground">
                Failed to load
              </span>
            </div>
          ) : (
            <CloudflareImage
              src={image.imageUrl}
              alt={image.alt || "Gallery image"}
              width={160}
              height={120}
              className={`w-full aspect-[4/3] object-cover group-hover:scale-105 transition-all bg-muted/10 ${
                isLoaded ? "opacity-100" : "opacity-0"
              }`}
              variant="thumbnail"
              onError={handleImageError}
              onLoad={handleImageLoad}
            />
          )}

          {!isLoaded && !hasError && (
            <div className="absolute inset-0 bg-muted/10 flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}

          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
            <Plus className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* Gallery name badge */}
          <div className="absolute bottom-1 left-1 right-1">
            <div className="bg-black/70 text-white text-xs px-2 py-1 rounded text-center truncate">
              {image.galleryName}
            </div>
          </div>
        </>
      )}
    </div>
  );
});

interface ImageGalleryPopupProps {
  finalImages: any[];
  loadingImages: boolean;
  projectId?: string;
  activeBlockId: string | null;
  onRefreshImages: () => void;
  onAddImage: (imageUrl: string, altText?: string, imageObject?: any) => void;
  children: React.ReactNode; // The trigger button
}

/**
 * ImageGalleryPopup - Popup version of ImageGallery for toolbar integration
 * Provides same functionality as ImageGallery but in a convenient popup format
 * Enhanced with larger size and search functionality
 */
export const ImageGalleryPopup = React.memo<ImageGalleryPopupProps>(
  function ImageGalleryPopup({
    finalImages,
    loadingImages,
    projectId,
    activeBlockId,
    onRefreshImages,
    onAddImage,
    children,
  }) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const handleAddImage = useCallback(
      (imageUrl: string, altText?: string, imageObject?: any) => {
        onAddImage(imageUrl, altText, imageObject);
        setIsOpen(false); // Close popup after adding image
      },
      [onAddImage]
    );

    // Filter images based on search term
    const filteredImages = useMemo(() => {
      if (!searchTerm.trim()) return finalImages;

      const searchLower = searchTerm.toLowerCase();
      return finalImages.filter((image: any) => {
        // Basic fields
        const alt = (image.alt || "").toLowerCase();
        const galleryName = (image.galleryName || "").toLowerCase();
        const fileName = (image.fileName || image.filename || "").toLowerCase();
        const url = (image.url || "").toLowerCase();

        // Metadata fields
        const description = (
          image.metadata?.description ||
          image.description ||
          ""
        ).toLowerCase();
        const angle = (
          image.metadata?.angle ||
          image.angle ||
          ""
        ).toLowerCase();
        const movement = (
          image.metadata?.movement ||
          image.movement ||
          ""
        ).toLowerCase();
        const tod = (image.metadata?.tod || image.tod || "").toLowerCase();
        const view = (image.metadata?.view || image.view || "").toLowerCase();
        const side = (image.metadata?.side || image.side || "").toLowerCase();

        return (
          alt.includes(searchLower) ||
          galleryName.includes(searchLower) ||
          fileName.includes(searchLower) ||
          url.includes(searchLower) ||
          description.includes(searchLower) ||
          angle.includes(searchLower) ||
          movement.includes(searchLower) ||
          tod.includes(searchLower) ||
          view.includes(searchLower) ||
          side.includes(searchLower)
        );
      });
    }, [finalImages, searchTerm]);

    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent
          className="w-[800px] max-w-[95vw] p-0"
          side="top"
          align="center"
          sideOffset={10}
        >
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ImageIcon className="h-4 w-4" />
                  <span>Add Images</span>
                  {finalImages.length > 0 && (
                    <Badge variant="outline" className="bg-transparent text-xs">
                      {filteredImages.length} of {finalImages.length} images
                    </Badge>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onRefreshImages}
                    disabled={loadingImages}
                    className="hover:bg-muted/20 h-7 w-7 p-0"
                  >
                    <RefreshCw
                      className={`h-3 w-3 ${loadingImages ? "animate-spin" : ""}`}
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                    className="hover:bg-muted/20 h-7 w-7 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </CardTitle>
              {activeBlockId && (
                <div className="text-xs text-muted-foreground">
                  Images will be inserted below the active block
                </div>
              )}
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {/* Search Bar */}
              {finalImages.length > 0 && (
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search images by name, gallery, description, angle, movement, time of day..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-9 text-sm"
                  />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSearchTerm("")}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 hover:bg-muted/20"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}

              {loadingImages ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2 text-sm">Loading images...</span>
                </div>
              ) : finalImages && finalImages.length > 0 ? (
                <>
                  {filteredImages.length > 0 ? (
                    <ScrollArea className="h-96">
                      <div className="grid grid-cols-4 gap-3">
                        {filteredImages.map((image: any, index: number) => (
                          <GalleryImage
                            key={`gallery-popup-image-${image.id || "no-id"}-${index}`}
                            image={image}
                            index={index}
                            onAddImage={handleAddImage}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No images match your search</p>
                      <p className="text-xs mt-1">
                        Try a different search term or clear the filter
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    No images found in{" "}
                    {projectId ? "project galleries" : "car gallery"}
                  </p>
                  {projectId && (
                    <p className="text-xs mt-1">
                      Make sure galleries are linked to this project
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </PopoverContent>
      </Popover>
    );
  }
);
