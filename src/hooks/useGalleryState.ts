import { useState, useCallback, useEffect } from "react";
import { toast } from "react-hot-toast";

export type GalleryMode = "editing" | "viewing";

export interface UploadProgress {
  fileName: string;
  progress: number;
  status:
    | "pending"
    | "uploading"
    | "processing"
    | "analyzing"
    | "complete"
    | "error";
  imageUrl?: string;
  metadata?: ImageMetadata;
  error?: string;
  currentStep?: string;
  stepProgress?: {
    cloudflare: {
      status: "pending" | "uploading" | "complete" | "error";
      progress: number;
      message?: string;
    };
    openai: {
      status: "pending" | "analyzing" | "complete" | "error";
      progress: number;
      message?: string;
    };
  };
}

export interface ImageMetadata {
  angle?: string;
  description?: string;
  movement?: string;
  tod?: string;
  view?: string;
  side?: string;
}

export interface NormalizedImage {
  id: string;
  url: string;
  filename: string;
  metadata: ImageMetadata;
  variants?: {
    [key: string]: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface FilterOptions {
  angles: string[];
  movements: string[];
  tods: string[];
  views: string[];
  sides: string[];
}

export interface FilterState {
  activeFilters: Record<string, string>;
  filterOptions: FilterOptions;
}

export interface GalleryState {
  mode: GalleryMode;
  images: NormalizedImage[];
  isLoading: boolean;
  isSyncing: boolean;
  filterState: FilterState;
  pendingChanges: Map<string, unknown>;
  error: Error | null;
}

const defaultFilterOptions: FilterOptions = {
  angles: ["front", "rear", "side", "interior", "exterior"],
  movements: ["static", "moving"],
  tods: ["day", "night", "sunset", "sunrise"],
  views: ["3/4", "profile", "detail"],
  sides: ["left", "right"],
};

const initialState: GalleryState = {
  mode: "viewing",
  images: [],
  isLoading: true,
  isSyncing: false,
  filterState: {
    activeFilters: {},
    filterOptions: defaultFilterOptions,
  },
  pendingChanges: new Map(),
  error: null,
};

export const useGalleryState = (carId: string) => {
  const [state, setState] = useState<GalleryState>(initialState);

  const normalizeImageData = useCallback((image: any): NormalizedImage => {
    return {
      id: image.id || image._id,
      url: image.url,
      filename: image.filename,
      metadata: {
        angle: image.metadata?.angle,
        description: image.metadata?.description,
        movement: image.metadata?.movement,
        tod: image.metadata?.tod,
        view: image.metadata?.view,
        side: image.metadata?.side,
      },
      variants: image.variants || {},
      createdAt: image.createdAt || new Date().toISOString(),
      updatedAt: image.updatedAt || new Date().toISOString(),
    };
  }, []);

  const synchronizeGalleryState = useCallback(async () => {
    if (!carId) return;

    try {
      if (process.env.NODE_ENV !== "production") {
        console.log("Starting gallery state synchronization", {
          carId: carId.substring(0, 8) + "***",
        });
      }

      const url = new URL(`/api/cars/${carId}`, window.location.origin);
      url.searchParams.set("includeImages", "true");
      if (process.env.NODE_ENV !== "production") {
        // [REMOVED] // [REMOVED] console.log("Fetching gallery data from:", url.pathname);
      }

      const response = await fetch(url.toString());
      if (process.env.NODE_ENV !== "production") {
        console.log("Gallery data response:", {
          status: response.status,
          ok: response.ok,
          statusText: response.statusText,
        });
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch car data: ${response.statusText}`);
      }

      const data = await response.json();
      if (process.env.NODE_ENV !== "production") {
        console.log("Received gallery data:", {
          hasData: !!data,
          hasImages: !!data.images,
          imageCount: data.images?.length || 0,
          hasPrimaryImageId: !!data.primaryImageId,
        });
      }

      // Normalize the image data
      const normalizedImages: NormalizedImage[] = (data.images || []).map(
        normalizeImageData
      );

      if (process.env.NODE_ENV !== "production") {
        console.log("Normalized images:", {
          count: normalizedImages.length,
          hasPrimaryId: !!data.primaryImageId,
        });
      }

      // Update state
      setState((prev) => ({
        ...prev,
        images: normalizedImages,
        isLoading: false,
        isSyncing: false,
        error: null,
      }));

      if (process.env.NODE_ENV !== "production") {
        // [REMOVED] // [REMOVED] console.log("Gallery state updated successfully");
      }
    } catch (error) {
      console.error("Error synchronizing gallery state:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isSyncing: false,
        error: error as Error,
      }));
    }
  }, [carId, normalizeImageData]);

  const handleModeTransition = useCallback(
    async (targetMode: GalleryMode) => {
      if (state.pendingChanges.size > 0 && targetMode === "viewing") {
        const shouldDiscard = window.confirm(
          "You have unsaved changes. Do you want to discard them?"
        );
        if (!shouldDiscard) {
          return;
        }
      }

      setState((prev) => ({ ...prev, mode: targetMode }));
      await synchronizeGalleryState();
    },
    [state.pendingChanges, synchronizeGalleryState]
  );

  const updateFilters = useCallback((newFilters: Record<string, string>) => {
    setState((prev) => ({
      ...prev,
      filterState: {
        ...prev.filterState,
        activeFilters: newFilters,
      },
    }));
  }, []);

  const addPendingChange = useCallback((key: string, value: unknown) => {
    setState((prev) => {
      const newPendingChanges = new Map(prev.pendingChanges);
      newPendingChanges.set(key, value);
      return {
        ...prev,
        pendingChanges: newPendingChanges,
      };
    });
  }, []);

  useEffect(() => {
    synchronizeGalleryState();
  }, [synchronizeGalleryState]);

  return {
    state,
    actions: {
      handleModeTransition,
      synchronizeGalleryState,
      updateFilters,
      addPendingChange,
    },
  };
};
