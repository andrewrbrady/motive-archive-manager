import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { FilterState, ExtendedImageType } from "@/types/gallery";
import { useFastRouter } from "@/lib/navigation/simple-cache";
import { useAPI } from "@/hooks/useAPI";

export function useImageGallery(carId: string, vehicleInfo?: any) {
  const router = useRouter();
  const { fastReplace } = useFastRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const lastNavigationRef = useRef<number>(0);
  const api = useAPI();

  // URL-based state
  const isEditMode = searchParams?.get("mode") === "edit";
  const urlPage = searchParams?.get("page");
  const currentImageId = searchParams?.get("image");

  // SWR for data fetching
  const { data, error, isLoading, mutate } = useSWR(
    `/api/cars/${carId}/images?limit=500`,
    fetcher
  );

  const images = useMemo(() => data?.images || [], [data?.images]);

  // Local state
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(0);
  const [filters, setFilters] = useState<FilterState>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [showImageInfo, setShowImageInfo] = useState(false);
  const [selectedUrlOption, setSelectedUrlOption] =
    useState<string>("Original");
  const [isReanalyzing, setIsReanalyzing] = useState(false);

  const itemsPerPage = 15;

  // Memoized filter options
  const filterOptions = useMemo(() => {
    const options = {
      angles: new Set<string>(),
      views: new Set<string>(),
      movements: new Set<string>(),
      tods: new Set<string>(),
      sides: new Set<string>(),
    };

    images.forEach((image: ExtendedImageType) => {
      const { metadata } = image;
      if (metadata?.angle?.trim()) options.angles.add(metadata.angle.trim());
      if (metadata?.view?.trim()) options.views.add(metadata.view.trim());
      if (metadata?.movement?.trim())
        options.movements.add(metadata.movement.trim());
      if (metadata?.tod?.trim()) options.tods.add(metadata.tod.trim());
      if (metadata?.side?.trim()) options.sides.add(metadata.side.trim());
    });

    return {
      angles: Array.from(options.angles).sort(),
      views: Array.from(options.views).sort(),
      movements: Array.from(options.movements).sort(),
      tods: Array.from(options.tods).sort(),
      sides: Array.from(options.sides).sort(),
    };
  }, [images]);

  // Memoized filtered images
  const filteredImages = useMemo(() => {
    return images.filter((image: ExtendedImageType) => {
      // Filter by metadata filters
      const matchesFilters = Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        const metadataValue =
          image.metadata?.[key as keyof typeof image.metadata];
        return metadataValue === value;
      });

      // Filter by search query
      const matchesSearch =
        !searchQuery ||
        image.metadata?.description
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        image.filename?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        image.metadata?.angle
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        image.metadata?.view?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesFilters && matchesSearch;
    });
  }, [images, filters, searchQuery]);

  // Memoized current image
  const currentImage = useMemo(() => {
    if (!currentImageId) return filteredImages[0];
    return (
      filteredImages.find(
        (img: ExtendedImageType) =>
          img.id === currentImageId || img._id === currentImageId
      ) || filteredImages[0]
    );
  }, [filteredImages, currentImageId]);

  const mainIndex = useMemo(() => {
    if (!currentImage) return 0;
    return filteredImages.findIndex(
      (img: ExtendedImageType) =>
        img.id === currentImage.id || img._id === currentImage._id
    );
  }, [filteredImages, currentImage]);

  // Memoized paginated images
  const paginatedImages = useMemo(() => {
    const startIndex = currentPage * itemsPerPage;
    return filteredImages.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredImages, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredImages.length / itemsPerPage);

  // Handlers
  const handlePageChange = useCallback(
    (newPage: number) => {
      try {
        setCurrentPage(newPage);
        const params = new URLSearchParams(searchParams?.toString() || "");
        params.set("page", (newPage + 1).toString());
        router.replace(`?${params.toString()}`, { scroll: false });
      } catch (error) {
        console.error("Error changing page:", error);
        // Fallback: just update local state
        setCurrentPage(newPage);
      }
    },
    [searchParams, router]
  );

  const setMainImage = useCallback(
    (imageId: string) => {
      try {
        // Minimal throttling for ultra-responsive feel
        const now = Date.now();
        if (now - lastNavigationRef.current < 50) {
          return; // Skip if called within 50ms of last call
        }
        lastNavigationRef.current = now;

        const imageIndex = filteredImages.findIndex(
          (img: ExtendedImageType) => img.id === imageId || img._id === imageId
        );
        if (imageIndex >= 0) {
          const targetPage = Math.floor(imageIndex / itemsPerPage);

          // Update local state immediately for instant UI feedback
          setCurrentPage(targetPage);

          // Batch URL updates to reduce navigation calls
          const params = new URLSearchParams(searchParams?.toString() || "");
          const currentImage = params.get("image");
          const currentPageParam = params.get("page");
          const newPageParam = (targetPage + 1).toString();

          // Only update URL if values actually changed
          if (currentImage !== imageId || currentPageParam !== newPageParam) {
            params.set("image", imageId);
            params.set("page", newPageParam);

            // Use ultra-fast router for instant navigation
            const newUrl = `?${params.toString()}`;
            fastReplace(newUrl, { scroll: false });
          }
        }
      } catch (error) {
        console.error("Error setting main image:", error);
        // Fallback: just update local state without URL navigation
        const imageIndex = filteredImages.findIndex(
          (img: ExtendedImageType) => img.id === imageId || img._id === imageId
        );
        if (imageIndex >= 0) {
          const targetPage = Math.floor(imageIndex / itemsPerPage);
          setCurrentPage(targetPage);
        }
      }
    },
    [filteredImages, itemsPerPage, searchParams, fastReplace]
  );

  const handleNext = useCallback(() => {
    try {
      const nextIndex = (mainIndex + 1) % filteredImages.length;
      const nextImage = filteredImages[nextIndex];
      if (nextImage) {
        setMainImage(nextImage.id || nextImage._id);
      }
    } catch (error) {
      console.error("Error navigating to next image:", error);
    }
  }, [mainIndex, filteredImages, setMainImage]);

  const handlePrev = useCallback(() => {
    try {
      const prevIndex =
        (mainIndex - 1 + filteredImages.length) % filteredImages.length;
      const prevImage = filteredImages[prevIndex];
      if (prevImage) {
        setMainImage(prevImage.id || prevImage._id);
      }
    } catch (error) {
      console.error("Error navigating to previous image:", error);
    }
  }, [mainIndex, filteredImages, setMainImage]);

  const toggleImageSelection = useCallback((imageId: string) => {
    setSelectedImages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(imageId)) {
        newSet.delete(imageId);
      } else {
        newSet.add(imageId);
      }
      return newSet;
    });
  }, []);

  const handleUploadComplete = useCallback(async () => {
    try {
      await mutate();
      setIsUploadDialogOpen(false);
      toast({
        title: "Success",
        description: "Images uploaded successfully",
      });
    } catch (error) {
      console.error("Error after upload:", error);
      toast({
        title: "Error",
        description: "Failed to refresh images after upload",
        variant: "destructive",
      });
    }
  }, [mutate, toast]);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedImages.size === 0) return;

    try {
      const imageIds = Array.from(selectedImages);
      const response = await fetch(`/api/cars/${carId}/images`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageIds,
          deleteFromStorage: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.status}`);
      }

      toast({
        title: "Success",
        description: `${imageIds.length} image(s) deleted successfully`,
      });
      setSelectedImages(new Set());
      await mutate();
    } catch (error) {
      console.error("Error deleting images:", error);
      toast({
        title: "Error",
        description: "Failed to delete images",
        variant: "destructive",
      });
    }
  }, [selectedImages, carId, toast, mutate]);

  const reanalyzeImage = useCallback(
    async (imageId: string, promptId?: string, modelId?: string) => {
      if (isReanalyzing || !api) return;

      setIsReanalyzing(true);
      try {
        const promptText = promptId ? " with custom prompt" : "";
        const modelText = modelId ? ` using ${modelId}` : "";

        toast({
          title: "Re-analyzing Image",
          description: `Using enhanced validation${promptText}${modelText} to improve metadata accuracy...`,
        });

        const requestBody: any = {
          imageId,
          carId,
        };

        if (promptId) {
          requestBody.promptId = promptId;
        }
        if (modelId) {
          requestBody.modelId = modelId;
        }

        const result = await api.post("/openai/reanalyze-image", requestBody);

        toast({
          title: "Re-analysis Complete",
          description: "Image metadata has been updated with improved accuracy",
        });

        await mutate();
      } catch (error) {
        console.error("Re-analysis error:", error);
        toast({
          title: "Re-analysis Failed",
          description:
            error instanceof Error
              ? error.message
              : "Failed to re-analyze image",
          variant: "destructive",
        });
      } finally {
        setIsReanalyzing(false);
      }
    },
    [isReanalyzing, carId, toast, mutate, api]
  );

  const handleSetPrimaryImage = useCallback(
    async (imageId: string) => {
      if (!api) return;

      try {
        await api.patch(`/cars/${carId}/thumbnail`, {
          primaryImageId: imageId,
        });

        toast({
          title: "Success",
          description: "Primary image updated successfully",
        });

        await mutate();
      } catch (error) {
        console.error("Error setting primary image:", error);
        toast({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to update primary image",
          variant: "destructive",
        });
        throw error; // Re-throw so the UI can handle the error state
      }
    },
    [carId, toast, mutate, api]
  );

  return {
    // Data
    images,
    filteredImages,
    paginatedImages,
    currentImage,
    filterOptions,
    isLoading,
    error,
    totalPages,
    mainIndex,

    // State
    filters,
    searchQuery,
    selectedImages,
    currentPage,
    isModalOpen,
    isUploadDialogOpen,
    showImageInfo,
    selectedUrlOption,
    isReanalyzing,
    isEditMode,

    // Actions
    setFilters,
    setSearchQuery,
    setSelectedImages,
    setCurrentPage: handlePageChange,
    setMainImage,
    handleNext,
    handlePrev,
    toggleImageSelection,
    setIsModalOpen,
    setIsUploadDialogOpen,
    setShowImageInfo,
    setSelectedUrlOption,
    handleUploadComplete,
    handleDeleteSelected,
    reanalyzeImage,
    handleSetPrimaryImage,
    mutate,
  };
}
