import { useMemo } from "react";
import { useAPIQuery } from "@/hooks/useAPIQuery";
import { fixCloudflareImageUrl } from "@/lib/image-utils";
import { SelectedCopy } from "@/components/content-studio/types";

export interface EnrichedImage {
  id: string;
  imageUrl: string;
  alt: string;
  galleryName: string;
  galleryNames?: string[];
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
  const normalizeId = (raw: any): string => {
    if (!raw) return "";
    if (typeof raw === "string") return raw;
    if (typeof raw === "object") {
      if (typeof (raw as any).toHexString === "function") {
        try {
          return (raw as any).toHexString();
        } catch {}
      }
      if (typeof (raw as any).$oid === "string") {
        return (raw as any).$oid as string;
      }
      const str = (raw as any).toString?.();
      if (typeof str === "string" && !str.startsWith("[object")) return str;
    }
    return "";
  };
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
      ? `cars/${effectiveCarId}/images?limit=all`
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

  // For car context: also fetch attached galleries to derive real gallery names
  const carGalleriesUrl =
    effectiveCarId && !effectiveProjectId
      ? `cars/${effectiveCarId}?includeGalleries=true`
      : null;

  const { data: carDataWithGalleries } = useAPIQuery<{
    galleries?: Array<{
      _id: string;
      name: string;
      imageIds?: string[];
      orderedImages?: Array<{ id: string; order: number }>;
    }>;
  }>(carGalleriesUrl || "null-query", {
    enabled: Boolean(carGalleriesUrl),
    staleTime: 5 * 60 * 1000,
  });

  // Build mapping from imageId -> set of galleryNames for car context
  const imageIdToGalleryNames = useMemo(() => {
    const map = new Map<string, Set<string>>();
    const galleries = carDataWithGalleries?.galleries || [];
    for (const gallery of galleries) {
      const entries: string[] = (gallery.orderedImages || []).map((x) =>
        normalizeId(x.id)
      );
      const fallbackIds = (gallery.imageIds || []).map((x) => normalizeId(x));
      const allIds = entries.length > 0 ? entries : fallbackIds;
      for (const imgId of allIds) {
        const key = normalizeId(imgId);
        if (!key) continue;
        const set = map.get(key) || new Set<string>();
        set.add(gallery.name);
        map.set(key, set);
      }
    }
    return map;
  }, [carDataWithGalleries?.galleries]);

  // Collect all image ids from attached car galleries
  const carGalleryImageIds = useMemo(() => {
    const ids = new Set<string>();
    const galleries = carDataWithGalleries?.galleries || [];
    for (const gallery of galleries) {
      const ordered = (gallery.orderedImages || []).map((x) =>
        normalizeId(x.id)
      );
      const plain = (gallery.imageIds || []).map((x) => normalizeId(x));
      const all = ordered.length > 0 ? ordered : plain;
      for (const id of all) {
        const nid = normalizeId(id);
        if (nid) ids.add(nid);
      }
    }
    return Array.from(ids);
  }, [carDataWithGalleries?.galleries]);

  // Fetch metadata for gallery images in car context (these may not have carId)
  const { data: carGalleryImageMetadata } = useAPIQuery<any[]>(
    carGalleryImageIds.length > 0
      ? `images/metadata?ids=${carGalleryImageIds.join(",")}`
      : "null-query",
    {
      enabled: carGalleryImageIds.length > 0,
      staleTime: 5 * 60 * 1000,
    }
  );

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
          galleryNames: [galleryImg.galleryName],
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
      galleryNames: Array.from(
        imageIdToGalleryNames.get((image._id || image.id || "").toString()) ||
          new Set<string>()
      ),
      galleryName:
        (imageIdToGalleryNames.get((image._id || image.id || "").toString()) &&
          Array.from(
            imageIdToGalleryNames.get(
              (image._id || image.id || "").toString()
            ) as Set<string>
          )[0]) ||
        "Car Images",
    }));
  }, [carImagesData?.images, imageIdToGalleryNames]);

  // Enrich gallery images fetched via metadata for car context
  const carGalleryImages = useMemo((): EnrichedImage[] => {
    if (!carGalleryImageMetadata || carGalleryImageMetadata.length === 0)
      return [];
    return carGalleryImageMetadata.map((img: any, index: number) => {
      const id = (img.imageId || img._id || "").toString();
      return {
        ...img,
        id,
        imageUrl: fixCloudflareImageUrl(img.url),
        alt: img.filename || `Car image ${index + 1}`,
        galleryNames: Array.from(
          imageIdToGalleryNames.get(id) || new Set<string>()
        ),
        galleryName:
          (imageIdToGalleryNames.get(id) &&
            Array.from(imageIdToGalleryNames.get(id) as Set<string>)[0]) ||
          "Car Images",
      } as EnrichedImage;
    });
  }, [carGalleryImageMetadata, imageIdToGalleryNames]);

  // Final images list: use project galleries or car images - OPTIMIZED with proper dependencies
  const finalImages = useMemo((): EnrichedImage[] => {
    if (effectiveProjectId) return enrichedGalleryImages;
    // Car context: merge car images and gallery images, dedupe by id
    const byId = new Map<string, EnrichedImage>();
    for (const img of carImages) {
      byId.set(img.id, { ...img });
    }
    for (const img of carGalleryImages) {
      const existing = byId.get(img.id);
      if (!existing) {
        byId.set(img.id, { ...img });
      } else {
        const mergedSet = new Set<string>(existing.galleryNames || []);
        (img.galleryNames || []).forEach((n) => mergedSet.add(n));
        const mergedNames = Array.from(mergedSet);
        byId.set(img.id, {
          ...existing,
          galleryNames: mergedNames,
          galleryName: mergedNames[0] || existing.galleryName,
        });
      }
    }
    return Array.from(byId.values());
  }, [effectiveProjectId, enrichedGalleryImages, carImages, carGalleryImages]);

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
