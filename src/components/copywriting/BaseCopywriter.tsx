"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAPIQuery } from "@/hooks/useAPIQuery";
import { toast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CarSelection } from "../projects/caption-generator/CarSelection";
import { ModelSelection } from "../projects/caption-generator/ModelSelection";
import { EventSelection } from "../projects/caption-generator/EventSelection";
import { GallerySelection } from "../projects/caption-generator/GallerySelection";
import { SystemPromptSelection } from "../projects/caption-generator/SystemPromptSelection";
import { BrandToneSelection } from "../projects/caption-generator/BrandToneSelection";
import { CaptionPreview } from "../projects/caption-generator/CaptionPreview";
import { GenerationControls } from "../projects/caption-generator/GenerationControls";
import { PromptEditModal } from "../projects/caption-generator/PromptEditModal";
import {
  usePromptHandlers,
  useFormState,
  useGenerationHandlers,
  useCaptionSaver,
  type PromptFormValues,
  type GenerationContext,
} from "../projects/caption-generator/handlers";
import type {
  PromptTemplate,
  Tone,
  Style,
  Platform,
  ProjectCar,
  ProjectEvent,
  SavedCaption as ProjectSavedCaption,
} from "../projects/caption-generator/types";
import type { ProviderId } from "@/lib/llmProviders";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { useBrandTones } from "@/hooks/useBrandTones";
import {
  saveSystemPrompt,
  restoreSystemPrompt,
} from "@/lib/copywriter-storage";

export interface CopywriterConfig {
  mode: "car" | "project";
  entityId: string; // carId for cars, projectId for projects
  title: string;
  apiEndpoints: {
    captions: string;
    systemPrompts: string;
    events?: string;
    galleries?: string;
  };
  features: {
    allowMultipleCars: boolean;
    allowEventSelection: boolean;
    allowMinimalCarData: boolean;
    showClientHandle: boolean;
    allowGallerySelection: boolean;
  };
  loadingStates?: {
    isLoadingModels?: boolean;
    isLoadingGalleries?: boolean;
    galleriesReady?: boolean;
  };
}

export interface CopywriterData {
  cars: ProjectCar[];
  models: any[]; // Vehicle models for copywriter context
  events: ProjectEvent[];
  galleries: any[]; // Project galleries with image metadata
  galleryImages: any[]; // Rich image metadata for galleries
  systemPrompts: any[];
  lengthSettings: any[];
  savedCaptions: ProjectSavedCaption[];
  clientHandle?: string | null;
  // Load more flags
  hasMoreEvents?: boolean;
  hasMoreCaptions?: boolean;
  hasMoreGalleries?: boolean;
}

export interface CopywriterCallbacks {
  onDataFetch: () => Promise<CopywriterData>;
  onSaveCaption: (captionData: any) => Promise<boolean>;
  onDeleteCaption: (captionId: string) => Promise<boolean>;
  onUpdateCaption: (captionId: string, newText: string) => Promise<boolean>;
  onRefresh: () => Promise<void>;
}

interface BaseCopywriterProps {
  config: CopywriterConfig;
  callbacks: CopywriterCallbacks;
}

/**
 * BaseCopywriter - Non-blocking copywriter component with shared cache strategy
 * Part of Phase 3 optimization - adds collapsible sections with lazy loading and localStorage persistence
 * Prevents duplicate API calls between car and project copywriters
 */
export function BaseCopywriter({ config, callbacks }: BaseCopywriterProps) {
  const { user } = useFirebaseAuth();

  // Shared cache strategy - Use direct useAPIQuery for system data that's common across all copywriters
  const {
    data: sharedSystemPrompts,
    isLoading: isLoadingSharedSystemPrompts,
    error: sharedSystemPromptsError,
  } = useAPIQuery<any[]>(`system-prompts/list`, {
    queryKey: ["shared-system-prompts"], // Shared cache key
    staleTime: 5 * 60 * 1000, // 5 minutes cache for system data
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
  });

  const {
    data: sharedLengthSettings,
    isLoading: isLoadingSharedLengthSettings,
    error: sharedLengthSettingsError,
  } = useAPIQuery<any[]>(`admin/length-settings`, {
    queryKey: ["shared-length-settings"], // Shared cache key
    staleTime: 5 * 60 * 1000, // 5 minutes cache for system data
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
  });

  // Brand tone data - Phase 2A: Fetch active brand tones for copywriter UI
  const {
    brandTones,
    isLoading: isLoadingBrandTones,
    error: brandTonesError,
  } = useBrandTones();

  // Entity-specific data query - calls onDataFetch for cars/events/captions
  const {
    data: entityData,
    isLoading: isLoadingEntityData,
    error: entityDataError,
    refetch: refreshData,
  } = useQuery<CopywriterData>({
    queryKey: [
      `copywriter-entity-data-${config.entityId}`,
      config.loadingStates?.galleriesReady,
    ],
    queryFn: callbacks.onDataFetch,
    enabled: !config.loadingStates?.isLoadingModels, // Wait for models data to finish loading
    staleTime: 3 * 60 * 1000, // 3 minutes cache for entity data
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
  });

  // Combine shared and entity-specific data with proper type safety
  const memoizedDataWithConditional = useMemo(() => {
    // Base data from entity and shared sources
    const baseData = {
      // Ensure arrays are properly initialized to prevent .map() errors
      cars: Array.isArray(entityData?.cars) ? entityData.cars : [],
      models: Array.isArray(entityData?.models) ? entityData.models : [],
      events: Array.isArray(entityData?.events) ? entityData.events : [],
      galleries: Array.isArray(entityData?.galleries)
        ? entityData.galleries
        : [],
      galleryImages: Array.isArray(entityData?.galleryImages)
        ? entityData.galleryImages
        : [],
      systemPrompts: Array.isArray(sharedSystemPrompts)
        ? sharedSystemPrompts
        : [],
      lengthSettings: Array.isArray(sharedLengthSettings)
        ? sharedLengthSettings
        : [],
      brandTones: Array.isArray(brandTones) ? brandTones : [], // Phase 2A: Include brand tones
      savedCaptions: Array.isArray(entityData?.savedCaptions)
        ? entityData.savedCaptions
        : [],
      clientHandle: entityData?.clientHandle || null,
      hasMoreEvents: entityData?.hasMoreEvents || false,
      hasMoreCaptions: entityData?.hasMoreCaptions || false,
      hasMoreGalleries: entityData?.hasMoreGalleries || false,
    };

    // Return base data - galleries are always available from entity data
    return {
      ...baseData,
      // Galleries are always available from base data when gallery selection is enabled
      galleries: baseData.galleries,
    };
  }, [
    entityData,
    sharedSystemPrompts,
    sharedLengthSettings,
    brandTones, // Phase 2A: Include brand tones dependency
  ]);

  // Combined loading state - must wait for both shared and entity data
  const isLoading =
    isLoadingSharedSystemPrompts ||
    isLoadingSharedLengthSettings ||
    isLoadingBrandTones ||
    isLoadingEntityData;

  const hasError =
    sharedSystemPromptsError ||
    sharedLengthSettingsError ||
    brandTonesError ||
    entityDataError;

  // Selection states
  const [selectedCarIds, setSelectedCarIds] = useState<string[]>([]);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [selectedGalleryIds, setSelectedGalleryIds] = useState<string[]>([]);
  const [selectedSystemPromptId, setSelectedSystemPromptId] =
    useState<string>("");
  const [selectedBrandToneId, setSelectedBrandToneId] = useState<string>(""); // Phase 2A: Brand tone selection
  const [
    hasUserInteractedWithCarSelection,
    setHasUserInteractedWithCarSelection,
  ] = useState(false);
  const [
    hasUserInteractedWithModelSelection,
    setHasUserInteractedWithModelSelection,
  ] = useState(false);

  // Car, model, event, and gallery detail states
  const [carDetails, setCarDetails] = useState<any[]>([]);
  const [modelDetails, setModelDetails] = useState<any[]>([]);
  const [eventDetails, setEventDetails] = useState<ProjectEvent[]>([]);
  const [galleryDetails, setGalleryDetails] = useState<any[]>([]);
  // Note: galleryImages comes from memoizedDataWithConditional.galleryImages, not local state

  // UI states
  const [contentViewMode, setContentViewMode] = useState<"preview" | "saved">(
    "preview"
  );
  const [showPreview, setShowPreview] = useState(false);
  const [editableLLMText, setEditableLLMText] = useState<string>("");
  const [useMinimalCarData, setUseMinimalCarData] = useState(false);
  const [enableStreaming, setEnableStreaming] = useState<boolean>(true);

  // Collapsible section states
  const [isCarSectionOpen, setIsCarSectionOpen] = useState(true);
  const [isModelSectionOpen, setIsModelSectionOpen] = useState(true);
  const [isEventSectionOpen, setIsEventSectionOpen] = useState(true);
  const [isGallerySectionOpen, setIsGallerySectionOpen] = useState(true);

  // Saved captions management
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingCaptionId, setEditingCaptionId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>("");

  // Load more functionality state (only loading states, hasMore comes from data)
  const [loadingMoreEvents, setLoadingMoreEvents] = useState(false);
  const [loadingMoreCaptions, setLoadingMoreCaptions] = useState(false);

  // Form state management - must be called before any early returns
  const { formState, handlers: formHandlers } = useFormState();

  // Prompt handlers with callbacks to update form state - must be called before any early returns
  const promptHandlers = usePromptHandlers({
    formHandlers,
    formState,
  });

  // Derive length from selected prompt template
  const derivedLength = useMemo(() => {
    if (!promptHandlers.selectedPrompt) return null;

    // Try to find matching length setting
    const matchedLength = memoizedDataWithConditional.lengthSettings.find(
      (l) => l.key === promptHandlers.selectedPrompt?.length
    );

    if (matchedLength) return matchedLength;

    // Fallback: try to find "standard" as default
    const standardLength = memoizedDataWithConditional.lengthSettings.find(
      (l) => l.key === "standard"
    );

    if (standardLength) {
      console.warn(
        `🚨 BaseCopywriter: Prompt template "${promptHandlers.selectedPrompt.name}" has invalid length "${promptHandlers.selectedPrompt.length}". Falling back to "standard".`
      );
      return standardLength;
    }

    // Last resort: use first available length setting
    if (memoizedDataWithConditional.lengthSettings.length > 0) {
      console.warn(
        `🚨 BaseCopywriter: No "standard" length found. Using first available: "${memoizedDataWithConditional.lengthSettings[0].key}"`
      );
      return memoizedDataWithConditional.lengthSettings[0];
    }

    // Ultimate fallback: create a default length setting
    console.error(
      "🚨 BaseCopywriter: No length settings available. Using hardcoded default."
    );
    return {
      key: "standard",
      name: "Standard",
      description: "2-3 lines",
      instructions: "Write a standard length caption of 2-3 lines.",
    };
  }, [
    promptHandlers.selectedPrompt,
    memoizedDataWithConditional.lengthSettings,
  ]);

  // Generation handlers - must be called before any early returns
  const { generationState, generateCaption, updateGeneratedCaption } =
    useGenerationHandlers();

  // Content saving - must be called before any early returns
  const { saveCaption } = useCaptionSaver();

  // Auto-select car for single car mode
  React.useEffect(() => {
    if (
      config.mode === "car" &&
      memoizedDataWithConditional.cars.length === 1 &&
      selectedCarIds.length === 0
    ) {
      setSelectedCarIds([memoizedDataWithConditional.cars[0]._id]);
      setCarDetails(memoizedDataWithConditional.cars);
    }
  }, [config.mode, memoizedDataWithConditional.cars, selectedCarIds.length]);

  // Auto-select cars for project mode
  React.useEffect(() => {
    if (
      config.mode === "project" &&
      memoizedDataWithConditional.cars.length > 0 &&
      selectedCarIds.length === 0 &&
      !hasUserInteractedWithCarSelection
    ) {
      // In project mode, auto-select all cars to enable generation controls
      const allCarIds = memoizedDataWithConditional.cars.map((car) => car._id);
      setSelectedCarIds(allCarIds);
      setCarDetails(memoizedDataWithConditional.cars);

      console.log(
        `🚗 BaseCopywriter: Auto-selected ${allCarIds.length} cars for project mode`
      );
    }
  }, [
    config.mode,
    memoizedDataWithConditional.cars,
    selectedCarIds.length,
    hasUserInteractedWithCarSelection,
  ]);

  // Auto-select models for project mode
  React.useEffect(() => {
    if (
      config.mode === "project" &&
      memoizedDataWithConditional.models.length > 0 &&
      selectedModelIds.length === 0 &&
      !hasUserInteractedWithModelSelection
    ) {
      // In project mode, auto-select all models to enable generation controls
      const allModelIds = memoizedDataWithConditional.models.map(
        (model) => model._id
      );
      setSelectedModelIds(allModelIds);
      setModelDetails(memoizedDataWithConditional.models);

      console.log(
        `🏭 BaseCopywriter: Auto-selected ${allModelIds.length} models for project mode`
      );
    }
  }, [
    config.mode,
    memoizedDataWithConditional.models,
    selectedModelIds.length,
    hasUserInteractedWithModelSelection,
  ]);

  // Fetch prompts when component mounts
  React.useEffect(() => {
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("BaseCopywriter: useEffect calling fetchPrompts...");
    promptHandlers.fetchPrompts();
  }, [promptHandlers.fetchPrompts]);

  // Debug logging for system prompts with enhanced data checking
  React.useEffect(() => {
    console.log("BaseCopywriter: System prompts data updated:", {
      sharedSystemPrompts: {
        value: sharedSystemPrompts,
        isArray: Array.isArray(sharedSystemPrompts),
        type: typeof sharedSystemPrompts,
        length: Array.isArray(sharedSystemPrompts)
          ? sharedSystemPrompts.length
          : "N/A",
      },
      memoizedSystemPrompts: {
        value: memoizedDataWithConditional.systemPrompts,
        isArray: Array.isArray(memoizedDataWithConditional.systemPrompts),
        length: memoizedDataWithConditional.systemPrompts.length,
      },
      loading: isLoading,
      error: hasError,
    });
  }, [
    memoizedDataWithConditional.systemPrompts,
    sharedSystemPrompts,
    isLoading,
    hasError,
  ]);

  // Debug logging for gallery data integration
  React.useEffect(() => {
    console.log("BaseCopywriter: Gallery data integration status:", {
      galleries: {
        available: Array.isArray(memoizedDataWithConditional.galleries),
        length: memoizedDataWithConditional.galleries?.length || 0,
      },
      mode: config.mode,
      entityId: config.entityId,
    });
  }, [memoizedDataWithConditional.galleries, config.mode, config.entityId]);

  // Debug logging for car data and selection states
  React.useEffect(() => {
    console.log("BaseCopywriter: Car selection state:", {
      mode: config.mode,
      entityId: config.entityId,
      availableCars: {
        count: memoizedDataWithConditional.cars.length,
        cars: memoizedDataWithConditional.cars.map((car) => ({
          id: car._id,
          make: car.make,
          model: car.model,
          year: car.year,
        })),
      },
      selectedCarIds: selectedCarIds,
      carDetails: {
        count: carDetails.length,
        details: carDetails.map((car) => ({
          id: car._id,
          make: car.make,
          model: car.model,
          year: car.year,
        })),
      },
      systemPrompts: {
        count: memoizedDataWithConditional.systemPrompts.length,
        selectedId: selectedSystemPromptId,
      },
    });
  }, [
    config.mode,
    config.entityId,
    memoizedDataWithConditional.cars,
    selectedCarIds,
    carDetails,
    memoizedDataWithConditional.systemPrompts,
    selectedSystemPromptId,
  ]);

  // Event selection handlers
  const handleEventSelection = useCallback(
    (eventId: string) => {
      setSelectedEventIds((prev) => {
        const newSelection = prev.includes(eventId)
          ? prev.filter((id) => id !== eventId)
          : [...prev, eventId];

        // Update event details based on selection
        const details = memoizedDataWithConditional.events.filter((event) =>
          newSelection.includes(event.id)
        );
        setEventDetails(details);

        return newSelection;
      });
    },
    [memoizedDataWithConditional.events]
  );

  const handleSelectAllEvents = useCallback(() => {
    const allEventIds = memoizedDataWithConditional.events.map(
      (event) => event.id
    );
    setSelectedEventIds(allEventIds);
    setEventDetails(memoizedDataWithConditional.events);
  }, [memoizedDataWithConditional.events]);

  // Load more events handler
  const handleLoadMoreEvents = useCallback(async () => {
    if (loadingMoreEvents || !memoizedDataWithConditional.hasMoreEvents) return;

    setLoadingMoreEvents(true);
    try {
      // This would need to be implemented in the callbacks
      // For now, just log that it was called
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔄 Load more events requested");
      // TODO: Implement actual load more logic in callbacks
    } catch (error) {
      console.error("Error loading more events:", error);
    } finally {
      setLoadingMoreEvents(false);
    }
  }, [loadingMoreEvents, memoizedDataWithConditional.hasMoreEvents]);

  // Gallery selection handlers
  const handleGallerySelection = useCallback(
    (galleryId: string) => {
      if (!config.features.allowGallerySelection) return;

      setSelectedGalleryIds((prev) => {
        const newSelection = prev.includes(galleryId)
          ? prev.filter((id) => id !== galleryId)
          : [...prev, galleryId];

        // Update gallery details based on selection
        const details = memoizedDataWithConditional.galleries.filter(
          (gallery) => newSelection.includes(gallery._id)
        );
        setGalleryDetails(details);

        return newSelection;
      });
    },
    [
      memoizedDataWithConditional.galleries,
      config.features.allowGallerySelection,
    ]
  );

  const handleSelectAllGalleries = useCallback(() => {
    if (!config.features.allowGallerySelection) return;

    const allGalleryIds = memoizedDataWithConditional.galleries.map(
      (gallery) => gallery._id
    );

    // If all galleries are selected, deselect all; otherwise select all
    if (selectedGalleryIds.length === allGalleryIds.length) {
      setSelectedGalleryIds([]);
      setGalleryDetails([]);
    } else {
      setSelectedGalleryIds(allGalleryIds);
      setGalleryDetails(memoizedDataWithConditional.galleries);
    }
  }, [
    memoizedDataWithConditional.galleries,
    config.features.allowGallerySelection,
    selectedGalleryIds.length,
  ]);

  // Car selection handlers (for multi-car mode)
  const handleCarSelection = useCallback(
    (carId: string) => {
      if (!config.features.allowMultipleCars) return;

      setHasUserInteractedWithCarSelection(true);
      setSelectedCarIds((prev) => {
        const newSelection = prev.includes(carId)
          ? prev.filter((id) => id !== carId)
          : [...prev, carId];

        // Update car details based on selection
        const details = memoizedDataWithConditional.cars.filter((car) =>
          newSelection.includes(car._id)
        );
        setCarDetails(details);

        return newSelection;
      });
    },
    [memoizedDataWithConditional.cars, config.features.allowMultipleCars]
  );

  const handleSelectAllCars = useCallback(() => {
    if (!config.features.allowMultipleCars) return;

    setHasUserInteractedWithCarSelection(true);
    const allCarIds = memoizedDataWithConditional.cars.map((car) => car._id);

    // If all cars are selected, deselect all; otherwise select all
    if (selectedCarIds.length === allCarIds.length) {
      setSelectedCarIds([]);
      setCarDetails([]);
    } else {
      setSelectedCarIds(allCarIds);
      setCarDetails(memoizedDataWithConditional.cars);
    }
  }, [
    memoizedDataWithConditional.cars,
    config.features.allowMultipleCars,
    selectedCarIds.length,
  ]);

  // Model selection handlers (for project mode)
  const handleModelSelection = useCallback(
    (modelId: string) => {
      if (config.mode !== "project") return;

      setHasUserInteractedWithModelSelection(true);
      setSelectedModelIds((prev) => {
        const newSelection = prev.includes(modelId)
          ? prev.filter((id) => id !== modelId)
          : [...prev, modelId];

        // Update model details based on selection
        const details = memoizedDataWithConditional.models.filter((model) =>
          newSelection.includes(model._id)
        );
        setModelDetails(details);

        return newSelection;
      });
    },
    [memoizedDataWithConditional.models, config.mode]
  );

  const handleSelectAllModels = useCallback(() => {
    if (config.mode !== "project") return;

    setHasUserInteractedWithModelSelection(true);
    const allModelIds = memoizedDataWithConditional.models.map(
      (model) => model._id
    );

    // If all models are selected, deselect all; otherwise select all
    if (selectedModelIds.length === allModelIds.length) {
      setSelectedModelIds([]);
      setModelDetails([]);
    } else {
      setSelectedModelIds(allModelIds);
      setModelDetails(memoizedDataWithConditional.models);
    }
  }, [
    memoizedDataWithConditional.models,
    config.mode,
    selectedModelIds.length,
  ]);

  // System prompt handler with localStorage persistence
  const handleSystemPromptChange = useCallback((promptId: string) => {
    setSelectedSystemPromptId(promptId);
    saveSystemPrompt(promptId);
  }, []);

  // Restore system prompt selection on mount
  useEffect(() => {
    const savedPromptId = restoreSystemPrompt();
    if (
      savedPromptId &&
      memoizedDataWithConditional.systemPrompts.some(
        (prompt) => prompt._id === savedPromptId
      )
    ) {
      setSelectedSystemPromptId(savedPromptId);
    }
  }, [memoizedDataWithConditional.systemPrompts]);

  // LLM preview handlers
  const buildLLMText = useCallback(() => {
    // Allow generation without cars for project-level content, but require system prompt
    if (!selectedSystemPromptId) return "";

    console.log("🖼️ buildLLMText: Starting with conditions:", {
      carDetailsLength: carDetails.length,
      selectedSystemPromptId,
      selectedGalleryIds: selectedGalleryIds.length,
      mode: config.mode,
    });

    let llmText = "";

    // Add system prompt context
    const systemPrompt = memoizedDataWithConditional.systemPrompts.find(
      (p) => p._id === selectedSystemPromptId
    );
    if (systemPrompt) {
      llmText += `SYSTEM PROMPT: ${systemPrompt.name}\n`;
      llmText += `${systemPrompt.prompt}\n\n`;
    }

    // Add brand tone instructions (Phase 2B: AI Prompt Integration)
    if (selectedBrandToneId && selectedBrandToneId !== "default") {
      const selectedBrandTone = brandTones.find(
        (tone) => tone._id === selectedBrandToneId
      );
      if (selectedBrandTone) {
        llmText += `BRAND TONE: ${selectedBrandTone.name}\n`;
        llmText += `TONE INSTRUCTIONS: ${selectedBrandTone.tone_instructions}\n`;
        if (selectedBrandTone.example_phrases.length > 0) {
          llmText += `EXAMPLE PHRASES: ${selectedBrandTone.example_phrases.join(", ")}\n`;
        }
        llmText += `\n`;
      }
    }

    // Add form context
    if (formState.context) {
      llmText += `CONTEXT:\n${formState.context}\n\n`;
    }

    if (formState.additionalContext) {
      llmText += `ADDITIONAL CONTEXT:\n${formState.additionalContext}\n\n`;
    }

    // Add car details
    if (carDetails.length === 1) {
      const car = carDetails[0];
      llmText += "CAR SPECIFICATIONS:\n";
      llmText += `Year: ${car.year}\n`;
      llmText += `Make: ${car.make}\n`;
      llmText += `Model: ${car.model}\n`;
      if (car.color) llmText += `Color: ${car.color}\n`;
      if (car.vin) llmText += `VIN: ${car.vin}\n`;
      if (car.condition) llmText += `Condition: ${car.condition}\n`;
      if (car.interior_color)
        llmText += `Interior Color: ${car.interior_color}\n`;

      // Mileage
      if (car.mileage) {
        llmText += `Mileage: ${car.mileage.value} ${car.mileage.unit || "mi"}\n`;
      }

      // Engine specifications
      if (car.engine) {
        if (car.engine.type) llmText += `Engine Type: ${car.engine.type}\n`;
        if (car.engine.displacement) {
          llmText += `Engine Displacement: ${car.engine.displacement.value} ${car.engine.displacement.unit}\n`;
        }
        if (car.engine.power?.hp) {
          llmText += `Horsepower: ${car.engine.power.hp} HP`;
          if (car.engine.power.kW) llmText += ` (${car.engine.power.kW} kW)`;
          llmText += `\n`;
        }
        if (car.engine.torque?.["lb-ft"]) {
          llmText += `Torque: ${car.engine.torque["lb-ft"]} lb-ft`;
          if (car.engine.torque.Nm) llmText += ` (${car.engine.torque.Nm} Nm)`;
          llmText += `\n`;
        }
        if (car.engine.configuration)
          llmText += `Engine Configuration: ${car.engine.configuration}\n`;
        if (car.engine.cylinders)
          llmText += `Cylinders: ${car.engine.cylinders}\n`;
        if (car.engine.fuelType)
          llmText += `Fuel Type: ${car.engine.fuelType}\n`;
        if (car.engine.features && car.engine.features.length > 0) {
          llmText += `Engine Features: ${car.engine.features.join(", ")}\n`;
        }
      }

      // Transmission
      if (car.transmission?.type) {
        llmText += `Transmission: ${car.transmission.type}`;
        if (car.transmission.speeds)
          llmText += ` (${car.transmission.speeds}-speed)`;
        llmText += `\n`;
      }

      // Manufacturing details
      if (car.manufacturing) {
        if (car.manufacturing.series)
          llmText += `Series: ${car.manufacturing.series}\n`;
        if (car.manufacturing.trim)
          llmText += `Trim: ${car.manufacturing.trim}\n`;
        if (car.manufacturing.bodyClass)
          llmText += `Body Class: ${car.manufacturing.bodyClass}\n`;
        if (car.manufacturing.plant) {
          let plantInfo = [];
          if (car.manufacturing.plant.city)
            plantInfo.push(car.manufacturing.plant.city);
          if (car.manufacturing.plant.country)
            plantInfo.push(car.manufacturing.plant.country);
          if (car.manufacturing.plant.company)
            plantInfo.push(`(${car.manufacturing.plant.company})`);
          if (plantInfo.length > 0)
            llmText += `Manufacturing Plant: ${plantInfo.join(", ")}\n`;
        }
      }

      // Performance
      if (car.performance) {
        if (car.performance["0_to_60_mph"]) {
          llmText += `0-60 mph: ${car.performance["0_to_60_mph"].value} ${car.performance["0_to_60_mph"].unit}\n`;
        }
        if (car.performance.top_speed) {
          llmText += `Top Speed: ${car.performance.top_speed.value} ${car.performance.top_speed.unit}\n`;
        }
      }

      // Interior features
      if (car.interior_features) {
        if (car.interior_features.seats)
          llmText += `Seats: ${car.interior_features.seats}\n`;
        if (car.interior_features.upholstery)
          llmText += `Upholstery: ${car.interior_features.upholstery}\n`;
        if (
          car.interior_features.features &&
          car.interior_features.features.length > 0
        ) {
          llmText += `Interior Features: ${car.interior_features.features.join(", ")}\n`;
        }
      }

      // Dimensions
      if (car.dimensions) {
        const dimKeys = [
          "length",
          "width",
          "height",
          "wheelbase",
          "weight",
        ] as const;
        dimKeys.forEach((key) => {
          if (car.dimensions![key]) {
            const dim = car.dimensions![key]!;
            llmText += `${key.charAt(0).toUpperCase() + key.slice(1)}: ${dim.value} ${dim.unit}\n`;
          }
        });
      }

      // Additional features
      if (car.doors) llmText += `Doors: ${car.doors}\n`;
      if (car.location) llmText += `Location: ${car.location}\n`;

      // Description
      if (car.description) llmText += `Description: ${car.description}\n`;
    } else if (carDetails.length > 1) {
      llmText += "SELECTED CARS:\n";
      carDetails.forEach((car, index) => {
        llmText += `Car ${index + 1}: ${car.year} ${car.make} ${car.model}`;
        if (car.color) llmText += ` (${car.color})`;
        if (car.engine?.type) llmText += ` - ${car.engine.type}`;
        if (car.transmission?.type) llmText += ` - ${car.transmission.type}`;
        llmText += `\n`;
      });
    }
    llmText += "\n";

    // Add model details if any
    if (modelDetails.length > 0) {
      if (modelDetails.length === 1) {
        const model = modelDetails[0];
        llmText += "VEHICLE MODEL SPECIFICATIONS:\n";
        llmText += `Make: ${model.make}\n`;
        llmText += `Model: ${model.model}\n`;

        if (model.generation) {
          llmText += `Generation: ${model.generation.code}\n`;
          if (model.generation.year_range) {
            const start = model.generation.year_range.start;
            const end = model.generation.year_range.end;
            llmText += `Production Years: ${start}${end ? `-${end}` : "-Present"}\n`;
          }

          if (
            model.generation.body_styles &&
            model.generation.body_styles.length > 0
          ) {
            llmText += `Body Styles: ${model.generation.body_styles.join(", ")}\n`;
          }

          if (model.generation.trims && model.generation.trims.length > 0) {
            llmText += `Available Trims: ${model.generation.trims.length} variants\n`;
            // Add a few example trims
            const exampleTrims = model.generation.trims
              .slice(0, 3)
              .map((trim: any) => trim.name);
            if (exampleTrims.length > 0) {
              llmText += `Example Trims: ${exampleTrims.join(", ")}\n`;
            }
          }
        }

        if (model.market_segment) {
          llmText += `Market Segment: ${model.market_segment}\n`;
        }

        if (model.engine_options && model.engine_options.length > 0) {
          llmText += `Engine Options: ${model.engine_options.length} available\n`;
          // Add details for first engine option
          const firstEngine = model.engine_options[0];
          if (firstEngine) {
            llmText += `Primary Engine: ${firstEngine.type || "Unknown"}`;
            if (firstEngine.displacement) {
              llmText += ` ${firstEngine.displacement.value}${firstEngine.displacement.unit}`;
            }
            if (firstEngine.power?.hp) {
              llmText += ` (${firstEngine.power.hp} HP)`;
            }
            if (firstEngine.fuel_type) {
              llmText += ` - ${firstEngine.fuel_type}`;
            }
            llmText += `\n`;
          }
        }

        if (model.description) {
          llmText += `Model Description: ${model.description}\n`;
        }
      } else {
        llmText += "SELECTED VEHICLE MODELS:\n";
        modelDetails.forEach((model, index) => {
          llmText += `Model ${index + 1}: ${model.make} ${model.model}`;
          if (model.generation?.code) llmText += ` (${model.generation.code})`;
          if (model.market_segment) llmText += ` - ${model.market_segment}`;
          llmText += `\n`;
        });
      }
      llmText += "\n";
    }

    // Add event details if any
    if (eventDetails.length > 0) {
      llmText += "ASSOCIATED EVENTS:\n";
      eventDetails.forEach((event, index) => {
        const eventDate = new Date(event.start);
        const isUpcoming = eventDate > new Date();

        llmText += `Event ${index + 1}:\n`;
        llmText += `  Title: ${event.title}\n`;
        llmText += `  Type: ${event.type}\n`;
        llmText += `  Start Date: ${eventDate.toLocaleDateString()} ${eventDate.toLocaleTimeString()}\n`;
        if (event.end) {
          const endDate = new Date(event.end);
          llmText += `  End Date: ${endDate.toLocaleDateString()} ${endDate.toLocaleTimeString()}\n`;
        }
        llmText += `  Timing: ${isUpcoming ? "Upcoming" : "Past"}\n`;
        if (event.description)
          llmText += `  Description: ${event.description}\n`;
        if (event.isAllDay) llmText += `  All Day Event: Yes\n`;
      });
      llmText += "\n";
    }

    // Add gallery and image metadata if any
    // Calculate gallery details dynamically based on selectedGalleryIds
    const currentGalleryDetails = memoizedDataWithConditional.galleries.filter(
      (gallery) => selectedGalleryIds.includes(gallery._id)
    );

    console.log("🖼️ LLM Context: Gallery data for LLM analysis:", {
      galleryDetailsLength: galleryDetails.length,
      currentGalleryDetailsLength: currentGalleryDetails.length,
      selectedGalleryIds,
      availableGalleryImages: memoizedDataWithConditional.galleryImages.length,
      availableGalleries: memoizedDataWithConditional.galleries?.length || 0,
      currentGalleryDetails: currentGalleryDetails.map((g) => ({
        id: g._id,
        name: g.name,
        imageCount: g.imageCount || g.imageIds?.length || 0,
      })),
      allGalleries:
        memoizedDataWithConditional.galleries?.slice(0, 2)?.map((g) => ({
          id: g._id,
          name: g.name,
        })) || [],
    });

    if (currentGalleryDetails.length > 0) {
      llmText += "ASSOCIATED GALLERIES:\n";
      currentGalleryDetails.forEach((gallery, index) => {
        llmText += `Gallery ${index + 1}:\n`;
        llmText += `  Name: ${gallery.name}\n`;
        if (gallery.description)
          llmText += `  Description: ${gallery.description}\n`;
        llmText += `  Images Count: ${gallery.imageCount || gallery.imageIds?.length || 0}\n`;

        // Add image metadata for this gallery
        const galleryImageData =
          memoizedDataWithConditional.galleryImages.filter((img: any) =>
            gallery.imageIds?.includes(img.id)
          );

        // 🖼️ COMPREHENSIVE IMAGE MATCHING DEBUGGING
        console.log(`🖼️ LLM Context: Processing gallery "${gallery.name}":`, {
          galleryImageIds: gallery.imageIds?.slice(0, 5), // Show first 5 IDs
          galleryImageIdsCount: gallery.imageIds?.length || 0,
          galleryImageIdsTypes: gallery.imageIds
            ?.slice(0, 3)
            .map((id: string) => ({
              id: id,
              type: typeof id,
              length: id?.toString().length,
            })),
          matchedImages: galleryImageData.length,
          sampleImageMetadata: galleryImageData[0]?.metadata,
          allAvailableImageIds: memoizedDataWithConditional.galleryImages
            .map((img: any) => img.id)
            .slice(0, 10),
          allAvailableImageIdsTypes: memoizedDataWithConditional.galleryImages
            .slice(0, 3)
            .map((img: any) => ({
              id: img.id,
              type: typeof img.id,
              length: img.id?.toString().length,
            })),
          galleryImageDataSample: galleryImageData.slice(0, 2).map((img) => ({
            id: img.id,
            metadata: img.metadata,
          })),
        });

        // 🖼️ ID MATCHING ANALYSIS - Check for format mismatches
        if (
          gallery.imageIds &&
          gallery.imageIds.length > 0 &&
          memoizedDataWithConditional.galleryImages.length > 0
        ) {
          const galleryIdSet = new Set(
            gallery.imageIds.map((id: string) => id.toString())
          );
          const imageIdSet = new Set(
            memoizedDataWithConditional.galleryImages.map((img: any) =>
              img.id.toString()
            )
          );

          console.log(
            `🖼️ LLM Context: ID matching analysis for gallery "${gallery.name}":`,
            {
              galleryIdsAsStrings: Array.from(galleryIdSet).slice(0, 5),
              imageIdsAsStrings: Array.from(imageIdSet).slice(0, 5),
              galleryIdsCount: galleryIdSet.size,
              imageIdsCount: imageIdSet.size,
              intersection: (Array.from(galleryIdSet) as string[])
                .filter((id: string) => imageIdSet.has(id))
                .slice(0, 5),
              intersectionCount: (Array.from(galleryIdSet) as string[]).filter(
                (id: string) => imageIdSet.has(id)
              ).length,
              potentialMatches:
                memoizedDataWithConditional.galleryImages.filter((img: any) =>
                  galleryIdSet.has(img.id.toString())
                ).length,
            }
          );

          // 🖼️ ENHANCED MATCHING - Try both original and string-normalized matching
          const enhancedGalleryImageData =
            memoizedDataWithConditional.galleryImages.filter((img: any) => {
              const imgIdStr = img.id.toString();
              return gallery.imageIds?.some(
                (galleryId: string) => galleryId.toString() === imgIdStr
              );
            });

          if (enhancedGalleryImageData.length > galleryImageData.length) {
            console.log(
              `🖼️ LLM Context: Enhanced matching found more images for gallery "${gallery.name}":`,
              {
                originalMatches: galleryImageData.length,
                enhancedMatches: enhancedGalleryImageData.length,
                additionalMatches:
                  enhancedGalleryImageData.length - galleryImageData.length,
              }
            );
            // Use the enhanced matching result
            galleryImageData.length = 0;
            galleryImageData.push(...enhancedGalleryImageData);
          }
        }

        console.log(
          `🖼️ LLM Context: Final processing results for gallery "${gallery.name}":`,
          {
            galleryImageIds: gallery.imageIds?.slice(0, 5), // Show first 5 IDs
            matchedImages: galleryImageData.length,
            sampleImageMetadata: galleryImageData[0]?.metadata,
            allAvailableImageIds: memoizedDataWithConditional.galleryImages
              .map((img: any) => img.id)
              .slice(0, 10),
            galleryImageDataSample: galleryImageData.slice(0, 2).map((img) => ({
              id: img.id,
              metadata: img.metadata,
            })),
          }
        );

        // 🖼️ ADD COMPLETE IMAGE OBJECTS WITH RICH METADATA TO LLM CONTEXT
        if (galleryImageData.length > 0) {
          llmText += `  Images with Metadata:\n`;

          // Add each image as a complete object with all its rich metadata
          galleryImageData.forEach((img, imgIndex) => {
            llmText += `    Image ${imgIndex + 1}:\n`;
            llmText += `      Filename: ${img.filename || "Unknown"}\n`;
            llmText += `      URL: ${img.url || "No URL"}\n`;

            // Add all available metadata fields
            if (img.metadata) {
              if (img.metadata.description) {
                llmText += `      Description: ${img.metadata.description}\n`;
              }
              if (img.metadata.angle) {
                llmText += `      Angle: ${img.metadata.angle}\n`;
              }
              if (img.metadata.view) {
                llmText += `      View: ${img.metadata.view}\n`;
              }
              if (img.metadata.movement) {
                llmText += `      Movement: ${img.metadata.movement}\n`;
              }
              if (img.metadata.tod) {
                llmText += `      Time of Day: ${img.metadata.tod}\n`;
              }
              if (img.metadata.side) {
                llmText += `      Side: ${img.metadata.side}\n`;
              }
              if (img.metadata.category) {
                llmText += `      Category: ${img.metadata.category}\n`;
              }
              if (img.metadata.isPrimary) {
                llmText += `      Primary Image: Yes\n`;
              }

              // Add any additional metadata fields that might exist
              const additionalFields = Object.keys(img.metadata).filter(
                (key) =>
                  ![
                    "description",
                    "angle",
                    "view",
                    "movement",
                    "tod",
                    "side",
                    "category",
                    "isPrimary",
                  ].includes(key)
              );
              additionalFields.forEach((field) => {
                if (
                  img.metadata[field] &&
                  typeof img.metadata[field] !== "object"
                ) {
                  llmText += `      ${field}: ${img.metadata[field]}\n`;
                }
              });
            }
            llmText += `\n`; // Add spacing between images
          });

          // Enhanced logging for complete image objects
          console.log(
            `🖼️ LLM Context: Added complete image objects for gallery "${gallery.name}":`,
            {
              totalImages: galleryImageData.length,
              sampleCompleteImage: {
                filename: galleryImageData[0]?.filename,
                url: galleryImageData[0]?.url,
                metadata: galleryImageData[0]?.metadata,
              },
              allImagesWithMetadata: galleryImageData.map((img, i) => ({
                index: i + 1,
                filename: img.filename,
                hasDescription: !!img.metadata?.description,
                hasAngle: !!img.metadata?.angle,
                hasView: !!img.metadata?.view,
                hasMovement: !!img.metadata?.movement,
                metadataFields: img.metadata
                  ? Object.keys(img.metadata).length
                  : 0,
              })),
              metadataFieldsFound: {
                descriptions: galleryImageData.filter(
                  (img) => img.metadata?.description
                ).length,
                angles: galleryImageData.filter((img) => img.metadata?.angle)
                  .length,
                views: galleryImageData.filter((img) => img.metadata?.view)
                  .length,
                movements: galleryImageData.filter(
                  (img) => img.metadata?.movement
                ).length,
                urls: galleryImageData.filter((img) => img.url).length,
              },
            }
          );
        } else {
          console.log(
            `🖼️ LLM Context: No image metadata found for gallery "${gallery.name}" - no images matched`
          );
        }
      });
      llmText += "\n";
    }

    // Add generation settings
    llmText += "GENERATION SETTINGS:\n";
    llmText += `Platform: ${formState.platform}\n`;
    llmText += `Tone: ${formState.tone}\n`;
    llmText += `Style: ${formState.style}\n`;
    if (derivedLength) {
      llmText += `Length: ${derivedLength.name} - ${derivedLength.description}\n`;
      llmText += `Length Instructions: ${derivedLength.instructions}\n`;
    }
    llmText += `Model: ${formState.model}\n`;
    llmText += `Temperature: ${formState.temperature}\n\n`;

    llmText += "Generate a caption that follows the requirements above.";

    // Log the final LLM context to verify gallery data inclusion
    const hasGalleryData = llmText.includes("ASSOCIATED GALLERIES:");
    console.log("🖼️ LLM Context: Final context for LLM generation:", {
      hasGalleryData,
      contextLength: llmText.length,
      gallerySection: hasGalleryData
        ? llmText.split("ASSOCIATED GALLERIES:")[1]?.split("\n\n")[0]
        : "No gallery data found",
      selectedGalleryCount: galleryDetails.length,
    });

    return llmText;
  }, [
    carDetails,
    modelDetails,
    selectedSystemPromptId,
    memoizedDataWithConditional.systemPrompts,
    selectedBrandToneId,
    brandTones,
    formState,
    eventDetails,
    galleryDetails,
    memoizedDataWithConditional.galleryImages,
    derivedLength,
  ]);

  const handleShowPreviewToggle = useCallback(() => {
    if (!showPreview) {
      const generatedText = buildLLMText();
      setEditableLLMText(generatedText);
    }
    setShowPreview(!showPreview);
  }, [showPreview, buildLLMText]);

  const handleRefreshLLMText = useCallback(() => {
    const generatedText = buildLLMText();
    setEditableLLMText(generatedText);
  }, [buildLLMText]);

  // Caption management
  const handleCopy = useCallback((text: string, id: string) => {
    // PHASE 3C FIX: Remove blocking await from background operations
    const copyOperation = () => {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          setCopiedId(id);
          setTimeout(() => setCopiedId(null), 2000);
          toast({
            title: "Copied",
            description: "Caption copied to clipboard",
          });
        })
        .catch((error) => {
          console.error("Failed to copy:", error);
          toast({
            title: "Error",
            description: "Failed to copy to clipboard",
            variant: "destructive",
          });
        });
    };

    // Execute copy operation in background - truly non-blocking
    setTimeout(copyOperation, 0);

    // Immediate optimistic feedback
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleStartEdit = useCallback(
    (captionId: string, currentText: string) => {
      setEditingCaptionId(captionId);
      setEditingText(currentText);
    },
    []
  );

  const handleCancelEdit = useCallback(() => {
    setEditingCaptionId(null);
    setEditingText("");
  }, []);

  const handleEditTextChange = useCallback((text: string) => {
    setEditingText(text);
  }, []);

  // Content actions
  const handleGenerateContent = async () => {
    // Allow generation even without cars - users might want project-level or general content
    // if (carDetails.length === 0) return;

    // Ensure editableLLMText is populated with current context before generation
    const currentLLMText = buildLLMText();
    setEditableLLMText(currentLLMText);

    console.log("🖼️ Generation: Built fresh LLM context:", {
      textLength: currentLLMText.length,
      hasGalleryData: currentLLMText.includes("ASSOCIATED GALLERIES:"),
      selectedGalleryCount: selectedGalleryIds.length,
      galleryImageCount: memoizedDataWithConditional.galleryImages.length,
    });

    const context: GenerationContext = {
      projectId: config.mode === "project" ? config.entityId : "",
      selectedCarIds,
      selectedModelIds,
      selectedEventIds,
      selectedSystemPromptId,
      carDetails,
      modelDetails,
      eventDetails,
      derivedLength,
      useMinimalCarData,
      editableLLMText: currentLLMText, // Use fresh LLM text
      clientHandle: memoizedDataWithConditional.clientHandle || null,
    };

    // Choose between streaming and regular generation
    if (enableStreaming) {
      // STREAMING GENERATION - Real-time caption building
      updateGeneratedCaption(""); // Clear previous caption

      try {
        // Prepare context for reuse (same as regular generation)
        const contextToUse = formState.additionalContext
          ? `${formState.context}\n\nAdditional context: ${formState.additionalContext}`
          : formState.context;

        // Build client info if needed
        const clientInfo = context.clientHandle
          ? {
              handle: context.clientHandle,
              includeInCaption: true,
            }
          : null;

        // Process car details appropriately (same as regular generation)
        let combinedCarDetails;
        if (
          Array.isArray(context.carDetails) &&
          context.carDetails.length > 0
        ) {
          combinedCarDetails = {
            cars: context.carDetails,
            count: context.carDetails.length,
            useMinimal: context.useMinimalCarData,
          };
        } else {
          console.warn(
            "Car details not provided or invalid:",
            context.carDetails
          );
          combinedCarDetails = {
            cars: [],
            count: 0,
            useMinimal: context.useMinimalCarData,
          };
        }

        // Process event details (same as regular generation)
        let combinedEventDetails = null;
        if (
          Array.isArray(context.eventDetails) &&
          context.eventDetails.length > 0
        ) {
          combinedEventDetails = {
            events: context.eventDetails,
            count: context.eventDetails.length,
            types: [
              ...new Set(context.eventDetails.map((event) => event.type)),
            ],
            upcomingEvents: context.eventDetails.filter(
              (event) => new Date(event.start) > new Date()
            ),
            pastEvents: context.eventDetails.filter(
              (event) => new Date(event.start) <= new Date()
            ),
          };
        }

        // Process model details
        let combinedModelDetails = null;
        if (
          Array.isArray(context.modelDetails) &&
          context.modelDetails.length > 0
        ) {
          combinedModelDetails = {
            models: context.modelDetails,
            count: context.modelDetails.length,
            makes: [
              ...new Set(context.modelDetails.map((model) => model.make)),
            ],
            segments: [
              ...new Set(
                context.modelDetails
                  .map((model) => model.market_segment)
                  .filter(Boolean)
              ),
            ],
          };
        }

        // Log gallery data being sent to LLM
        console.log("🖼️ LLM API Call: Gallery data check:", {
          hasCustomLLMText: !!context.editableLLMText,
          customLLMTextLength: context.editableLLMText?.length || 0,
          hasGalleryDataInText:
            context.editableLLMText?.includes("ASSOCIATED GALLERIES:") || false,
          selectedGalleryIds: selectedGalleryIds,
          galleryPreview: context.editableLLMText?.includes(
            "ASSOCIATED GALLERIES:"
          )
            ? context.editableLLMText
                .split("ASSOCIATED GALLERIES:")[1]
                ?.split("\n\n")[0]
                ?.slice(0, 300) + "..."
            : "No gallery data found",
        });

        const response = await fetch(
          "/api/openai/generate-project-caption-stream",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              platform: formState.platform,
              context: contextToUse,
              clientInfo,
              carDetails: combinedCarDetails,
              eventDetails: combinedEventDetails,
              modelDetails: combinedModelDetails,
              temperature: formState.temperature,
              tone: formState.tone,
              style: formState.style,
              length: context.derivedLength?.key || "standard",
              template: formState.context,
              aiModel: formState.model,
              projectId: context.projectId,
              selectedCarIds: context.selectedCarIds,
              selectedModelIds: context.selectedModelIds,
              selectedEventIds: context.selectedEventIds,
              selectedSystemPromptId: context.selectedSystemPromptId,
              useMinimalCarData: context.useMinimalCarData,
              customLLMText: context.editableLLMText,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body reader available");
        }

        const decoder = new TextDecoder();
        let accumulator = "";
        let chunkCount = 0;

        toast({
          title: "✨ Streaming Caption",
          description: "Watch your caption appear in real-time!",
        });

        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🎬 Frontend: Starting stream reading...");

        // Read the stream and build caption progressively with timeout protection
        const streamTimeout = setTimeout(() => {
          reader.cancel();
          console.warn(
            "⏰ Frontend: Stream reading timeout after 60s - finalizing caption"
          );
          if (accumulator) {
            updateGeneratedCaption(accumulator);
            toast({
              title: "⚠️ Stream Timeout",
              description: "Caption generation completed but may be truncated",
              variant: "destructive",
            });
          }
        }, 60000); // 60 second timeout

        // PHASE 3C FIX: Non-blocking stream reading using recursive setTimeout pattern
        const readNextChunk = () => {
          reader
            .read()
            .then(({ done, value }) => {
              if (done) {
                console.log(
                  `✅ Frontend: Stream completed after ${chunkCount} chunks, total length: ${accumulator.length}`
                );
                clearTimeout(streamTimeout);
                toast({
                  title: "🎉 Caption Complete!",
                  description: "Your caption has been generated successfully",
                });
                return;
              }

              if (value) {
                chunkCount++;
                const chunk = decoder.decode(value, { stream: true });
                accumulator += chunk;

                console.log(
                  `📤 Frontend: Chunk ${chunkCount}: +${chunk.length} chars (total: ${accumulator.length})`
                );

                // Update the caption in real-time - users see words appearing!
                updateGeneratedCaption(accumulator);
              } else {
                console.log(
                  `⚠️ Frontend: Chunk ${chunkCount + 1} had no value`
                );
              }

              // Continue reading next chunk in background
              setTimeout(readNextChunk, 0);
            })
            .catch((streamError) => {
              clearTimeout(streamTimeout);
              console.error("❌ Frontend: Stream reading error:", streamError);

              // If we have partial content, use it
              if (accumulator) {
                console.log(
                  `⚠️ Frontend: Using partial content (${accumulator.length} chars)`
                );
                updateGeneratedCaption(accumulator);
                toast({
                  title: "⚠️ Partial Caption",
                  description:
                    "Caption generation was interrupted but partial content is available",
                  variant: "destructive",
                });
              } else {
                toast({
                  title: "Error",
                  description:
                    "Failed to generate streaming caption. Try regular mode.",
                  variant: "destructive",
                });
              }
            });
        };

        // Start reading first chunk in background
        setTimeout(readNextChunk, 0);
      } catch (error: any) {
        console.error("Error in streaming generation:", error);
        toast({
          title: "Error",
          description:
            "Failed to generate streaming caption. Try regular mode.",
          variant: "destructive",
        });
      }
    } else {
      // REGULAR GENERATION - Traditional approach
      const generateOperation = () => {
        generateCaption(context, formState).catch((error) => {
          console.error("Error generating caption:", error);
        });
      };

      setTimeout(generateOperation, 0);

      toast({
        title: "Generating...",
        description: "Caption is being generated in background",
      });
    }
  };

  const handleSaveContent = async () => {
    const contentToSave = generationState.generatedCaption;
    if (!contentToSave) return;

    const captionData = {
      platform: formState.platform,
      context: formState.context,
      caption: contentToSave,
      [config.mode === "car" ? "carId" : "projectId"]: config.entityId,
      ...(config.mode === "project" && {
        carIds: selectedCarIds,
        eventIds: selectedEventIds,
      }),
    };

    // Phase 3C FIX: Remove blocking await from background operations
    const saveOperation = () => {
      callbacks
        .onSaveCaption(captionData)
        .then((success) => {
          if (success) {
            // Force refresh of the main entity data to update UI immediately
            refreshData().catch((error) => {
              console.error("Error refreshing entity data after save:", error);
            });

            // Also call the callback refresh for consistency
            callbacks.onRefresh().catch((error) => {
              console.error("Error refreshing after save:", error);
            });

            setContentViewMode("saved");
            toast({
              title: "Success",
              description: "Caption saved and refreshed successfully",
            });
          }
        })
        .catch((error) => {
          console.error("Error saving caption:", error);
          // Error handling is already in callbacks
        });
    };

    // Execute save operation in background - truly non-blocking
    setTimeout(saveOperation, 0);

    // Immediate optimistic feedback
    toast({
      title: "Saving...",
      description: "Caption is being saved in background",
    });
  };

  const handleDeleteContent = async (contentId: string) => {
    // Phase 3C FIX: Remove blocking await from background operations
    const deleteOperation = () => {
      callbacks
        .onDeleteCaption(contentId)
        .then((success) => {
          if (success) {
            // Force refresh of the main entity data to update UI immediately
            refreshData().catch((error) => {
              console.error(
                "Error refreshing entity data after delete:",
                error
              );
            });

            // Also call the callback refresh for consistency
            callbacks.onRefresh().catch((error) => {
              console.error("Error refreshing after delete:", error);
            });

            toast({
              title: "Success",
              description: "Caption deleted and refreshed successfully",
            });
          }
        })
        .catch((error) => {
          console.error("Error deleting caption:", error);
          // Error handling is already in callbacks
        });
    };

    // Execute delete operation in background - truly non-blocking
    setTimeout(deleteOperation, 0);

    // Immediate optimistic feedback
    toast({
      title: "Deleting...",
      description: "Caption is being deleted in background",
    });
  };

  const handleSaveEdit = async (contentId: string) => {
    try {
      // Keep edit mode open while saving
      toast({
        title: "Saving...",
        description: "Updating caption...",
      });

      // Wait for the update to complete
      const success = await callbacks.onUpdateCaption(contentId, editingText);

      if (success) {
        // Only close edit mode after successful save
        handleCancelEdit();

        // Force refresh of the main entity data to update UI immediately
        try {
          await refreshData();
        } catch (error) {
          console.error("Error refreshing entity data after update:", error);
        }

        // Also refresh through callback for consistency
        try {
          await callbacks.onRefresh();
        } catch (error) {
          console.error("Error refreshing after update:", error);
        }

        toast({
          title: "Success",
          description: "Caption updated successfully",
        });
      } else {
        // Keep edit mode open on failure so user can try again
        toast({
          title: "Error",
          description: "Failed to update caption",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating caption:", error);
      // Keep edit mode open on error so user can try again
      toast({
        title: "Error",
        description: "Failed to update caption",
        variant: "destructive",
      });
    }
  };

  const handleUpdatePreviewContent = (newContent: string) => {
    updateGeneratedCaption(newContent);
  };

  // Helper function to update form values from prompt values
  const updateFormFromPromptValues = useCallback(
    (values: {
      context: string;
      tone: string;
      style: string;
      platform: string;
      model: string;
      provider: string;
      temperature: number;
    }) => {
      formHandlers.updateFormValues({
        context: values.context,
        additionalContext: formState.additionalContext,
        tone: values.tone as Tone,
        style: values.style as Style,
        platform: values.platform as Platform,
        model: values.model,
        provider: values.provider as ProviderId,
        temperature: values.temperature,
      });
    },
    [formHandlers, formState.additionalContext]
  );

  // Load more captions handler
  const handleLoadMoreCaptions = useCallback(async () => {
    if (loadingMoreCaptions || !memoizedDataWithConditional.hasMoreCaptions)
      return;

    setLoadingMoreCaptions(true);
    try {
      // This would need to be implemented in the callbacks
      // For now, just log that it was called
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔄 Load more captions requested");
      // TODO: Implement actual load more logic in callbacks
    } catch (error) {
      console.error("Error loading more captions:", error);
    } finally {
      setLoadingMoreCaptions(false);
    }
  }, [loadingMoreCaptions, memoizedDataWithConditional.hasMoreCaptions]);

  // Handle error state without blocking UI
  if (hasError) {
    console.error("Error fetching copywriter data:", hasError);
  }

  // Non-blocking loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading copywriter...</p>
          <p className="text-xs text-muted-foreground text-center">
            You can switch tabs while this loads
          </p>
        </div>
      </div>
    );
  }

  // Error display - non-blocking
  if (hasError) {
    return (
      <div className="py-8">
        <div className="bg-destructive/15 border border-destructive/20 rounded-md p-4 max-w-md mx-auto">
          <p className="text-destructive text-sm text-center mb-3">
            Failed to load copywriter data. Tab switching is still available.
          </p>
          <div className="flex justify-center">
            <Button variant="outline" size="sm" onClick={() => refreshData()}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[calc(100vh-200px)]">
        {/* Left Column - Configuration */}
        <div className="space-y-6">
          {/* Car Selection */}
          <CarSelection
            projectCars={memoizedDataWithConditional.cars}
            selectedCarIds={selectedCarIds}
            loadingCars={isLoading}
            onCarSelection={handleCarSelection}
            onSelectAllCars={handleSelectAllCars}
            isOpen={isCarSectionOpen}
            onToggle={setIsCarSectionOpen}
          />

          {/* Model Selection - Only for project mode */}
          {config.mode === "project" &&
            memoizedDataWithConditional.models.length > 0 && (
              <ModelSelection
                projectModels={memoizedDataWithConditional.models}
                selectedModelIds={selectedModelIds}
                loadingModels={isLoading}
                onModelSelection={handleModelSelection}
                onSelectAllModels={handleSelectAllModels}
                isOpen={isModelSectionOpen}
                onToggle={setIsModelSectionOpen}
              />
            )}

          {/* Event Selection */}
          {config.features.allowEventSelection && (
            <EventSelection
              projectEvents={memoizedDataWithConditional.events}
              selectedEventIds={selectedEventIds}
              loadingEvents={isLoading || loadingMoreEvents}
              onEventSelection={handleEventSelection}
              onSelectAllEvents={handleSelectAllEvents}
              hasMoreEvents={memoizedDataWithConditional.hasMoreEvents}
              onLoadMoreEvents={handleLoadMoreEvents}
              isOpen={isEventSectionOpen}
              onToggle={setIsEventSectionOpen}
            />
          )}

          {/* Gallery Selection - For both project and car mode when enabled */}
          {config.features.allowGallerySelection && (
            <GallerySelection
              projectGalleries={memoizedDataWithConditional.galleries}
              selectedGalleryIds={selectedGalleryIds}
              loadingGalleries={isLoading}
              onGallerySelection={handleGallerySelection}
              onSelectAllGalleries={handleSelectAllGalleries}
              hasMoreGalleries={memoizedDataWithConditional.hasMoreGalleries}
              galleryImages={memoizedDataWithConditional.galleryImages}
              isOpen={isGallerySectionOpen}
              onToggle={setIsGallerySectionOpen}
            />
          )}

          {/* System Prompt Selection */}
          <SystemPromptSelection
            systemPrompts={memoizedDataWithConditional.systemPrompts}
            selectedSystemPromptId={selectedSystemPromptId}
            loadingSystemPrompts={isLoading}
            systemPromptError={
              sharedSystemPromptsError ? String(sharedSystemPromptsError) : null
            }
            onSystemPromptChange={handleSystemPromptChange}
          />

          {/* Brand Tone Selection - Phase 2A */}
          <BrandToneSelection
            brandTones={memoizedDataWithConditional.brandTones}
            selectedBrandToneId={selectedBrandToneId}
            loadingBrandTones={isLoadingBrandTones}
            brandToneError={brandTonesError ? String(brandTonesError) : null}
            onBrandToneChange={setSelectedBrandToneId}
          />

          {/* Generation Controls */}
          <GenerationControls
            selectedCarIds={selectedCarIds}
            promptList={promptHandlers.promptList}
            selectedPrompt={promptHandlers.selectedPrompt}
            promptLoading={promptHandlers.promptLoading}
            promptError={promptHandlers.promptError}
            onPromptChange={promptHandlers.handlePromptChange}
            onEditPrompt={promptHandlers.handleEditPrompt}
            onNewPrompt={promptHandlers.handleNewPrompt}
            additionalContext={formState.additionalContext}
            onAdditionalContextChange={formHandlers.updateAdditionalContext}
            context={formState.context}
            platform={formState.platform}
            tone={formState.tone}
            style={formState.style}
            derivedLength={derivedLength}
            selectedEventIds={selectedEventIds}
            useMinimalCarData={useMinimalCarData}
            onUseMinimalCarDataChange={setUseMinimalCarData}
            showPreview={showPreview}
            onShowPreviewToggle={handleShowPreviewToggle}
            editableLLMText={editableLLMText}
            onEditableLLMTextChange={setEditableLLMText}
            onRefreshLLMText={handleRefreshLLMText}
            selectedSystemPromptId={selectedSystemPromptId}
            systemPrompts={memoizedDataWithConditional.systemPrompts}
            projectCars={memoizedDataWithConditional.cars}
            projectEvents={memoizedDataWithConditional.events}
            model={formState.model}
            temperature={formState.temperature}
            isGenerating={generationState.isGenerating}
            onGenerate={handleGenerateContent}
            error={generationState.error}
            enableStreaming={enableStreaming}
            onStreamingToggle={setEnableStreaming}
          />
        </div>

        {/* Right Column - Preview and Saved Content */}
        <div className="flex flex-col h-full min-h-[600px]">
          <CaptionPreview
            generatedCaption={generationState.generatedCaption}
            platform={formState.platform}
            copiedId={copiedId}
            onCopyCaption={handleCopy}
            onSaveCaption={handleSaveContent}
            viewMode={contentViewMode}
            onViewModeChange={setContentViewMode}
            savedCaptions={memoizedDataWithConditional.savedCaptions}
            editingCaptionId={editingCaptionId}
            editingText={editingText}
            onStartEdit={handleStartEdit}
            onCancelEdit={handleCancelEdit}
            onSaveEdit={handleSaveEdit}
            onEditTextChange={handleEditTextChange}
            onDeleteCaption={handleDeleteContent}
            onUpdatePreviewCaption={handleUpdatePreviewContent}
            hasMoreCaptions={memoizedDataWithConditional.hasMoreCaptions}
            onLoadMoreCaptions={handleLoadMoreCaptions}
            loadingCaptions={loadingMoreCaptions}
          />
        </div>
      </div>

      {/* Modal for Editing or Creating Prompts */}
      <PromptEditModal
        isOpen={promptHandlers.isOpen}
        onClose={promptHandlers.close}
        isCreating={promptHandlers.isCreating}
        selectedPrompt={promptHandlers.selectedPrompt}
        model={formState.model}
        provider={formState.provider}
        temperature={formState.temperature}
        clientHandle={memoizedDataWithConditional.clientHandle || null}
        onPromptSaved={(prompt: PromptTemplate) => {
          promptHandlers.handlePromptSaved(prompt);
        }}
        onModelChange={formHandlers.updateModel}
        onProviderChange={formHandlers.updateProvider}
        onTemperatureChange={formHandlers.updateTemperature}
        onFormValuesUpdate={updateFormFromPromptValues}
        currentFormValues={{
          context: formState.context,
          platform: formState.platform,
          tone: formState.tone,
          style: formState.style,
        }}
      />

      {promptHandlers.promptError && (
        <p className="mt-3 text-sm text-destructive-500 dark:text-destructive-400 text-center">
          {promptHandlers.promptError}
        </p>
      )}
    </div>
  );
}
