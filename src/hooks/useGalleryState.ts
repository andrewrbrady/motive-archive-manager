import { useState, useCallback, useEffect, useRef } from "react";
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

  // Use ref to prevent duplicate requests
  const isLoadingRef = useRef(false);

  // Stable normalize function
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
    if (!carId || isLoadingRef.current) return;

    try {
      isLoadingRef.current = true;
      setState((prev) => ({ ...prev, isSyncing: true, error: null }));

      const url = new URL(`/api/cars/${carId}`, window.location.origin);
      url.searchParams.set("includeImages", "true");

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`Failed to fetch car data: ${response.statusText}`);
      }

      const data = await response.json();
      const normalizedImages: NormalizedImage[] = (data.images || []).map(
        normalizeImageData
      );

      setState((prev) => ({
        ...prev,
        images: normalizedImages,
        isLoading: false,
        isSyncing: false,
        error: null,
      }));
    } catch (error: any) {
      console.error("Error synchronizing gallery state:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isSyncing: false,
        error: error as Error,
      }));
    } finally {
      isLoadingRef.current = false;
    }
  }, [carId, normalizeImageData]);

  const handleModeTransition = useCallback(
    async (targetMode: GalleryMode) => {
      setState((prev) => {
        if (prev.pendingChanges.size > 0 && targetMode === "viewing") {
          const shouldDiscard = window.confirm(
            "You have unsaved changes. Do you want to discard them?"
          );
          if (!shouldDiscard) {
            return prev;
          }
        }
        return { ...prev, mode: targetMode };
      });

      // Refresh data when switching modes
      await synchronizeGalleryState();
    },
    [synchronizeGalleryState]
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

  // Load data when carId changes
  useEffect(() => {
    if (carId) {
      synchronizeGalleryState();
    }
  }, [carId, synchronizeGalleryState]);

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
