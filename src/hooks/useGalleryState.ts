import { useState, useCallback, useEffect } from "react";
import { toast } from "react-hot-toast";

export type GalleryMode = "editing" | "viewing";

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
      id: image.id,
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
    };
  }, []);

  const synchronizeGalleryState = useCallback(async () => {
    setState((prev) => ({ ...prev, isSyncing: true }));
    try {
      const response = await fetch(
        `/api/cars/${carId}?includeImages=true&t=${Date.now()}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch gallery data");
      }
      const data = await response.json();

      setState((prev) => ({
        ...prev,
        images: data.images.map(normalizeImageData),
        isLoading: false,
        isSyncing: false,
        error: null,
      }));
    } catch (error) {
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
      if (targetMode === "viewing") {
        await synchronizeGalleryState();
      }
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
