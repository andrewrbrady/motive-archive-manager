"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Loader2, ImageIcon, RefreshCw, Plus, X, Search } from "lucide-react";
import { CloudflareImage } from "@/components/ui/CloudflareImage";
import { useAPI } from "@/hooks/useAPI";

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
  carId?: string | null;
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
    carId,
    activeBlockId,
    onRefreshImages,
    onAddImage,
    children,
  }) {
    const api = useAPI();
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedGallery, setSelectedGallery] = useState<string>("");
    const [selectedView, setSelectedView] = useState<string>("");
    const [selectedAngle, setSelectedAngle] = useState<string>("");
    const [carGalleries, setCarGalleries] = useState<
      Array<{ _id: string; name: string }>
    >([]);
    const [loadingGalleries, setLoadingGalleries] = useState(false);

    // Load actual galleries for car context so dropdown reflects attachments
    useEffect(() => {
      const loadGalleries = async () => {
        if (!api || !carId) return;
        try {
          setLoadingGalleries(true);
          const data = (await api.get(
            `cars/${carId}?includeGalleries=true`
          )) as {
            galleries?: Array<{ _id: string; name: string }>;
          };
          setCarGalleries(data?.galleries || []);
        } catch (err) {
          // Non-blocking failure; fallback will be finalImages-derived names
          setCarGalleries([]);
        } finally {
          setLoadingGalleries(false);
        }
      };
      loadGalleries();
    }, [api, carId]);

    // Derive available filter options from images
    const availableViews = useMemo(() => {
      const set = new Set<string>();
      for (const img of finalImages) {
        const val = (img.metadata?.view || img.view || "").toString().trim();
        if (val) set.add(val);
      }
      return Array.from(set).sort();
    }, [finalImages]);

    const availableAngles = useMemo(() => {
      const set = new Set<string>();
      for (const img of finalImages) {
        const val = (img.metadata?.angle || img.angle || "").toString().trim();
        if (val) set.add(val);
      }
      return Array.from(set).sort();
    }, [finalImages]);

    const availableGalleries = useMemo(() => {
      // Prefer actual attached galleries for car context when available
      if (carId && carGalleries.length > 0) {
        return carGalleries.map((g) => g.name).sort();
      }
      // Fallback: derive from images (include multi-membership)
      const set = new Set<string>();
      for (const img of finalImages) {
        const primary = (img.galleryName || "").toString().trim();
        if (primary) set.add(primary);
        const names: string[] = Array.isArray(img.galleryNames)
          ? img.galleryNames
          : [];
        for (const n of names) {
          const v = (n || "").toString().trim();
          if (v) set.add(v);
        }
      }
      return Array.from(set).sort();
    }, [finalImages, carId, carGalleries]);

    const handleAddImage = useCallback(
      (imageUrl: string, altText?: string, imageObject?: any) => {
        onAddImage(imageUrl, altText, imageObject);
        setIsOpen(false); // Close popup after adding image
      },
      [onAddImage]
    );

    // Filter images based on search term
    const filteredImages = useMemo(() => {
      const searchLower = searchTerm.trim().toLowerCase();
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
        const viewRaw = image.metadata?.view || image.view || "";
        const sideRaw = image.metadata?.side || image.side || "";
        const view = viewRaw.toString().toLowerCase();
        const side = sideRaw.toString().toLowerCase();
        const angleLower = (image.metadata?.angle || image.angle || "")
          .toString()
          .toLowerCase();

        const matchesSearch = !searchLower
          ? true
          : alt.includes(searchLower) ||
            galleryName.includes(searchLower) ||
            fileName.includes(searchLower) ||
            url.includes(searchLower) ||
            description.includes(searchLower) ||
            angle.includes(searchLower) ||
            movement.includes(searchLower) ||
            tod.includes(searchLower) ||
            view.includes(searchLower) ||
            side.includes(searchLower);

        const matchesView = !selectedView
          ? true
          : viewRaw?.toString().toLowerCase() === selectedView.toLowerCase();
        const matchesAngle = !selectedAngle
          ? true
          : angleLower === selectedAngle.toLowerCase();
        const matchesGallery = !selectedGallery
          ? true
          : (() => {
              const sel = selectedGallery.toLowerCase();
              const primary = (image.galleryName || "")
                .toString()
                .toLowerCase();
              if (primary === sel) return true;
              const names: string[] = Array.isArray(image.galleryNames)
                ? image.galleryNames
                : [];
              return names.some(
                (n) => (n || "").toString().toLowerCase() === sel
              );
            })();

        return matchesSearch && matchesView && matchesAngle && matchesGallery;
      });
    }, [finalImages, searchTerm, selectedView, selectedAngle, selectedGallery]);

    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent
          className="w-[1100px] max-w-[98vw] p-0 z-[5000] overflow-visible"
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
              {/* Search Bar + Simple Filters */}
              {finalImages.length > 0 && (
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative flex-1">
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
                  {/* Gallery filter */}
                  {availableGalleries.length > 0 && (
                    <div className="relative z-[6000]">
                      <Select
                        value={selectedGallery}
                        onValueChange={(val) =>
                          setSelectedGallery(val === "__all__" ? "" : val)
                        }
                      >
                        <SelectTrigger className="w-[200px] h-9 text-sm">
                          <SelectValue placeholder="Gallery" />
                        </SelectTrigger>
                        <SelectContent className="z-[7000]" position="popper">
                          <SelectItem value="__all__">All Galleries</SelectItem>
                          {availableGalleries.map((g) => (
                            <SelectItem key={g} value={g}>
                              {g}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {/* View filter */}
                  {availableViews.length > 0 && (
                    <div className="relative z-[6000]">
                      <Select
                        value={selectedView}
                        onValueChange={(val) =>
                          setSelectedView(val === "__all__" ? "" : val)
                        }
                      >
                        <SelectTrigger className="w-[160px] h-9 text-sm">
                          <SelectValue placeholder="View" />
                        </SelectTrigger>
                        <SelectContent className="z-[7000]" position="popper">
                          <SelectItem value="__all__">All Views</SelectItem>
                          {availableViews.map((v) => (
                            <SelectItem key={v} value={v}>
                              {v}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {/* Angle filter */}
                  {availableAngles.length > 0 && (
                    <div className="relative z-[6000]">
                      <Select
                        value={selectedAngle}
                        onValueChange={(val) =>
                          setSelectedAngle(val === "__all__" ? "" : val)
                        }
                      >
                        <SelectTrigger className="w-[160px] h-9 text-sm">
                          <SelectValue placeholder="Angle" />
                        </SelectTrigger>
                        <SelectContent className="z-[7000]" position="popper">
                          <SelectItem value="__all__">All Angles</SelectItem>
                          {availableAngles.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
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
                    <ScrollArea className="h-[520px]">
                      <div className="grid grid-cols-5 gap-3">
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
