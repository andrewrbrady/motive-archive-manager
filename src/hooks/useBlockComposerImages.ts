import { useMemo } from "react";
import { useAPIQuery } from "@/hooks/useAPIQuery";
import { fixCloudflareImageUrl } from "@/lib/image-utils";
import { SelectedCopy } from "@/components/content-studio/types";

export interface EnrichedImage {
  id: string;
  imageUrl: string;
  alt: string;
  galleryName: string;
  order?: number;
  filename?: string;
  url?: string;
}

/**
 * Custom hook for handling image gallery operations in BlockComposer
 * Extracted from BlockComposer.tsx to reduce file size and improve maintainability
 */
export function useBlockComposerImages(
  selectedCopies: SelectedCopy[],
  carId?: string,
  projectId?: string
) {
  // Determine context for image gallery - prioritize passed params, fallback to selectedCopies
  const effectiveCarId = carId || selectedCopies[0]?.carId;
  const effectiveProjectId = projectId || selectedCopies[0]?.projectId;

  // For projects: fetch linked galleries first, then extract images from them
  // For cars: fetch images directly from the car
  const galleriesUrl = effectiveProjectId
    ? `projects/${effectiveProjectId}/galleries`
    : null;
  const carImagesUrl =
    effectiveCarId && !effectiveProjectId
      ? `cars/${effectiveCarId}/images`
      : null;

  const {
    data: galleriesData,
    isLoading: loadingGalleries,
    refetch: refetchGalleries,
  } = useAPIQuery<{ galleries: any[] }>(galleriesUrl || "null-query", {
    enabled: Boolean(galleriesUrl),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  const {
    data: carImagesData,
    isLoading: loadingCarImages,
    refetch: refetchCarImages,
  } = useAPIQuery<{ images: any[] }>(carImagesUrl || "null-query", {
    enabled: Boolean(carImagesUrl),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  // Extract all images from linked galleries (for projects) - OPTIMIZED
  const galleryImages = useMemo(() => {
    if (!galleriesData?.galleries) return [];

    const images: any[] = [];
    galleriesData.galleries.forEach((gallery) => {
      // Use orderedImages if available for proper ordering, fallback to imageIds
      const imageList =
        gallery.orderedImages?.length > 0
          ? gallery.orderedImages.map((item: any) => ({
              id: item.id,
              order: item.order,
              galleryName: gallery.name,
            }))
          : gallery.imageIds?.map((id: string, index: number) => ({
              id,
              order: index,
              galleryName: gallery.name,
            })) || [];

      images.push(...imageList);
    });

    return images.sort((a, b) => a.order - b.order);
  }, [galleriesData?.galleries]);

  // Extract unique image IDs to fetch actual image data (for projects)
  const imageIds = useMemo(() => {
    return [...new Set(galleryImages.map((img) => img.id))];
  }, [galleryImages]);

  // Fetch actual image data for the image IDs (for projects)
  const { data: imageMetadata, isLoading: loadingImageData } = useAPIQuery<
    any[]
  >(
    imageIds.length > 0
      ? `images/metadata?ids=${imageIds.join(",")}`
      : "null-query",
    {
      enabled: imageIds.length > 0,
      staleTime: 5 * 60 * 1000, // 5 minutes cache
    }
  );

  // Combine gallery context with image data (for projects) - OPTIMIZED
  const enrichedGalleryImages = useMemo((): EnrichedImage[] => {
    if (!imageMetadata || !galleryImages.length) return [];

    // Create a map of image ID to metadata for O(1) lookup instead of nested loops
    const imageDataMap = new Map(
      imageMetadata.map((img) => [img.imageId || img._id, img])
    );

    // Enrich gallery images with actual image data
    return galleryImages
      .map((galleryImg) => {
        const imageData = imageDataMap.get(galleryImg.id);
        if (!imageData) return null;

        return {
          ...imageData,
          id: galleryImg.id,
          order: galleryImg.order,
          galleryName: galleryImg.galleryName,
          // Ensure we have proper URL and alt text for the UI with proper Cloudflare formatting
          imageUrl: fixCloudflareImageUrl(imageData.url),
          alt: imageData.filename || `Image from ${galleryImg.galleryName}`,
        };
      })
      .filter(Boolean) as EnrichedImage[];
  }, [imageMetadata, galleryImages]);

  // Process car images (for cars) - OPTIMIZED
  const carImages = useMemo((): EnrichedImage[] => {
    if (!carImagesData?.images) return [];

    return carImagesData.images.map((image: any, index: number) => ({
      ...image,
      id: image._id || image.id,
      imageUrl: fixCloudflareImageUrl(image.url),
      alt: image.filename || `Car image ${index + 1}`,
      galleryName: "Car Images",
    }));
  }, [carImagesData?.images]);

  // Final images list: use project galleries or car images - OPTIMIZED with proper dependencies
  const finalImages = useMemo((): EnrichedImage[] => {
    return effectiveProjectId ? enrichedGalleryImages : carImages;
  }, [effectiveProjectId, enrichedGalleryImages, carImages]);

  // Loading state for images
  const loadingImages =
    loadingGalleries || loadingImageData || loadingCarImages;

  // Refetch function
  const refetchImages = effectiveProjectId
    ? refetchGalleries
    : refetchCarImages;

  // Statistics
  const imageStats = useMemo(() => {
    const totalImages = finalImages.length;
    const galleryCount = effectiveProjectId
      ? galleriesData?.galleries?.length || 0
      : carImagesData
        ? 1
        : 0;

    return {
      totalImages,
      galleryCount,
      hasImages: totalImages > 0,
      isEmpty: totalImages === 0,
      isProject: Boolean(effectiveProjectId),
      isCar: Boolean(effectiveCarId && !effectiveProjectId),
    };
  }, [
    finalImages.length,
    effectiveProjectId,
    galleriesData?.galleries?.length,
    carImagesData,
    effectiveCarId,
  ]);

  return {
    // Images data
    finalImages,
    galleryImages: enrichedGalleryImages,
    carImages,

    // Loading states
    loadingImages,
    loadingGalleries,
    loadingCarImages,
    loadingImageData,

    // Actions
    refetchImages,
    refetchGalleries,
    refetchCarImages,

    // Metadata
    imageStats,
    projectId: effectiveProjectId,
    carId: effectiveCarId,

    // Raw data (for debugging/advanced use)
    galleriesData,
    carImagesData,
    imageMetadata,
  };
}
