"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAPIQuery } from "@/hooks/useAPIQuery";
import { toast } from "@/components/ui/use-toast";
import { Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CarSelection } from "../projects/caption-generator/CarSelection";
import { EventSelection } from "../projects/caption-generator/EventSelection";
import { SystemPromptSelection } from "../projects/caption-generator/SystemPromptSelection";
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
import {
  saveSystemPrompt,
  restoreSystemPrompt,
  saveDataSourceSections,
  restoreDataSourceSections,
  getDefaultDataSourceSections,
  type DataSourceSections,
} from "@/lib/copywriter-storage";

export interface CopywriterConfig {
  mode: "car" | "project";
  entityId: string; // carId for cars, projectId for projects
  title: string;
  apiEndpoints: {
    captions: string;
    systemPrompts: string;
    events?: string;
  };
  features: {
    allowMultipleCars: boolean;
    allowEventSelection: boolean;
    allowMinimalCarData: boolean;
    showClientHandle: boolean;
  };
}

export interface CopywriterData {
  cars: ProjectCar[];
  events: ProjectEvent[];
  systemPrompts: any[];
  lengthSettings: any[];
  savedCaptions: ProjectSavedCaption[];
  clientHandle?: string | null;
  // Enhanced data integration for richer content generation
  deliverables?: any[];
  galleries?: any[];
  inspections?: any[];
  // Load more flags
  hasMoreEvents?: boolean;
  hasMoreCaptions?: boolean;
}

export interface CopywriterCallbacks {
  onDataFetch: () => Promise<CopywriterData>;
  onConditionalDataFetch?: (
    sections: DataSourceSections
  ) => Promise<Partial<CopywriterData>>;
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

  // Data source section states with localStorage persistence
  const [dataSections, setDataSections] = useState<DataSourceSections>(() => {
    return restoreDataSourceSections() || getDefaultDataSourceSections();
  });

  // Save data sections to localStorage whenever they change
  useEffect(() => {
    saveDataSourceSections(dataSections);
  }, [dataSections]);

  // Conditional data states
  const [conditionalData, setConditionalData] = useState<
    Partial<CopywriterData>
  >({});
  const [loadingConditionalData, setLoadingConditionalData] = useState<{
    deliverables: boolean;
    galleries: boolean;
    inspections: boolean;
  }>({
    deliverables: false,
    galleries: false,
    inspections: false,
  });

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

  // Entity-specific data query - calls onDataFetch for cars/events/captions
  const {
    data: entityData,
    isLoading: isLoadingEntityData,
    error: entityDataError,
    refetch: refreshData,
  } = useQuery<CopywriterData>({
    queryKey: [`copywriter-entity-data-${config.entityId}`],
    queryFn: callbacks.onDataFetch,
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
      events: Array.isArray(entityData?.events) ? entityData.events : [],
      systemPrompts: Array.isArray(sharedSystemPrompts)
        ? sharedSystemPrompts
        : [],
      lengthSettings: Array.isArray(sharedLengthSettings)
        ? sharedLengthSettings
        : [],
      savedCaptions: Array.isArray(entityData?.savedCaptions)
        ? entityData.savedCaptions
        : [],
      clientHandle: entityData?.clientHandle || null,
      hasMoreEvents: entityData?.hasMoreEvents || false,
      hasMoreCaptions: entityData?.hasMoreCaptions || false,
    };

    // Add conditional data only if sections are expanded
    return {
      ...baseData,
      deliverables: dataSections.deliverables
        ? Array.isArray(conditionalData.deliverables)
          ? conditionalData.deliverables
          : []
        : [],
      galleries: dataSections.galleries
        ? Array.isArray(conditionalData.galleries)
          ? conditionalData.galleries
          : []
        : [],
      inspections: dataSections.inspections
        ? Array.isArray(conditionalData.inspections)
          ? conditionalData.inspections
          : []
        : [],
    };
  }, [
    entityData,
    sharedSystemPrompts,
    sharedLengthSettings,
    conditionalData,
    dataSections,
  ]);

  // Combined loading state - must wait for both shared and entity data
  const isLoading =
    isLoadingSharedSystemPrompts ||
    isLoadingSharedLengthSettings ||
    isLoadingEntityData;

  const hasError =
    sharedSystemPromptsError || sharedLengthSettingsError || entityDataError;

  // Selection states
  const [selectedCarIds, setSelectedCarIds] = useState<string[]>([]);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [selectedSystemPromptId, setSelectedSystemPromptId] =
    useState<string>("");

  // Car and event detail states
  const [carDetails, setCarDetails] = useState<any[]>([]);
  const [eventDetails, setEventDetails] = useState<ProjectEvent[]>([]);

  // UI states
  const [contentViewMode, setContentViewMode] = useState<"preview" | "saved">(
    "preview"
  );
  const [showPreview, setShowPreview] = useState(false);
  const [editableLLMText, setEditableLLMText] = useState<string>("");
  const [useMinimalCarData, setUseMinimalCarData] = useState(false);
  const [enableStreaming, setEnableStreaming] = useState<boolean>(true);

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
      selectedCarIds.length === 0
    ) {
      // In project mode, auto-select all cars to enable generation controls
      const allCarIds = memoizedDataWithConditional.cars.map((car) => car._id);
      setSelectedCarIds(allCarIds);
      setCarDetails(memoizedDataWithConditional.cars);

      console.log(
        `🚗 BaseCopywriter: Auto-selected ${allCarIds.length} cars for project mode`
      );
    }
  }, [config.mode, memoizedDataWithConditional.cars, selectedCarIds.length]);

  // Fetch prompts when component mounts
  React.useEffect(() => {
    console.log("BaseCopywriter: useEffect calling fetchPrompts...");
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

  // Debug logging for enhanced data integration
  React.useEffect(() => {
    console.log("BaseCopywriter: Enhanced data integration status:", {
      deliverables: {
        available: Array.isArray(memoizedDataWithConditional.deliverables),
        length: memoizedDataWithConditional.deliverables?.length || 0,
        sample: memoizedDataWithConditional.deliverables?.[0]
          ? {
              id:
                memoizedDataWithConditional.deliverables[0]._id ||
                memoizedDataWithConditional.deliverables[0].id,
              title: memoizedDataWithConditional.deliverables[0].title,
              type: memoizedDataWithConditional.deliverables[0].type,
            }
          : null,
      },
      galleries: {
        available: Array.isArray(memoizedDataWithConditional.galleries),
        length: memoizedDataWithConditional.galleries?.length || 0,
      },
      inspections: {
        available: Array.isArray(memoizedDataWithConditional.inspections),
        length: memoizedDataWithConditional.inspections?.length || 0,
      },
      mode: config.mode,
      entityId: config.entityId,
    });
  }, [
    memoizedDataWithConditional.deliverables,
    memoizedDataWithConditional.galleries,
    memoizedDataWithConditional.inspections,
    config.mode,
    config.entityId,
  ]);

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
      console.log("🔄 Load more events requested");
      // TODO: Implement actual load more logic in callbacks
    } catch (error) {
      console.error("Error loading more events:", error);
    } finally {
      setLoadingMoreEvents(false);
    }
  }, [loadingMoreEvents, memoizedDataWithConditional.hasMoreEvents]);

  // Car selection handlers (for multi-car mode)
  const handleCarSelection = useCallback(
    (carId: string) => {
      if (!config.features.allowMultipleCars) return;

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

    const allCarIds = memoizedDataWithConditional.cars.map((car) => car._id);
    setSelectedCarIds(allCarIds);
    setCarDetails(memoizedDataWithConditional.cars);
  }, [memoizedDataWithConditional.cars, config.features.allowMultipleCars]);

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

  // Conditional data fetching handler
  const handleSectionToggle = useCallback(
    (section: keyof DataSourceSections) => {
      const newSections = {
        ...dataSections,
        [section]: !dataSections[section],
      };
      setDataSections(newSections);

      // If section is being opened and we don't have data, fetch it
      if (
        newSections[section] &&
        !conditionalData[section] &&
        callbacks.onConditionalDataFetch
      ) {
        // PHASE 3C FIX: Remove blocking await from background operations
        const fetchOperation = () => {
          setLoadingConditionalData((prev) => ({ ...prev, [section]: true }));

          console.log(
            `🔄 BaseCopywriter: Fetching ${section} data for ${config.mode} ${config.entityId}`
          );

          callbacks.onConditionalDataFetch!({
            deliverables: section === "deliverables",
            galleries: section === "galleries",
            inspections: section === "inspections",
          })
            .then((sectionData) => {
              setConditionalData((prev) => ({ ...prev, ...sectionData }));
              console.log(
                `✅ BaseCopywriter: Successfully fetched ${section} data`
              );
            })
            .catch((error) => {
              console.warn(
                `⚠️ BaseCopywriter: Failed to fetch ${section} data:`,
                error
              );
              toast({
                title: "Data Loading Error",
                description: `Failed to load ${section} data. Please try again.`,
                variant: "destructive",
              });
            })
            .finally(() => {
              setLoadingConditionalData((prev) => ({
                ...prev,
                [section]: false,
              }));
            });
        };

        // Execute fetch operation in background - truly non-blocking
        setTimeout(fetchOperation, 0);
      }
    },
    [dataSections, conditionalData, callbacks, config.mode, config.entityId]
  );

  // LLM preview handlers
  const buildLLMText = useCallback(() => {
    if (carDetails.length === 0 || !selectedSystemPromptId) return "";

    let llmText = "";

    // Add system prompt context
    const systemPrompt = memoizedDataWithConditional.systemPrompts.find(
      (p) => p._id === selectedSystemPromptId
    );
    if (systemPrompt) {
      llmText += `SYSTEM PROMPT: ${systemPrompt.name}\n`;
      llmText += `${systemPrompt.prompt}\n\n`;
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

    return llmText;
  }, [
    carDetails,
    selectedSystemPromptId,
    memoizedDataWithConditional.systemPrompts,
    formState,
    eventDetails,
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
    if (carDetails.length === 0) return;

    const context: GenerationContext = {
      projectId: config.mode === "project" ? config.entityId : "",
      selectedCarIds,
      selectedEventIds,
      selectedSystemPromptId,
      carDetails,
      eventDetails,
      derivedLength,
      useMinimalCarData,
      editableLLMText,
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
              temperature: formState.temperature,
              tone: formState.tone,
              style: formState.style,
              length: context.derivedLength?.key || "standard",
              template: formState.context,
              aiModel: formState.model,
              projectId: context.projectId,
              selectedCarIds: context.selectedCarIds,
              selectedEventIds: context.selectedEventIds,
              systemPromptId: context.selectedSystemPromptId,
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

        console.log("🎬 Frontend: Starting stream reading...");

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

        // Refresh the data
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
      console.log("🔄 Load more captions requested");
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
          />

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

          {/* Data Source Sections - Collapsible with Lazy Loading */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Enhanced Data Sources</CardTitle>
              <p className="text-sm text-muted-foreground">
                Expand sections to load additional data for richer content
                generation
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Deliverables Section */}
              <Collapsible
                open={dataSections.deliverables}
                onOpenChange={() => handleSectionToggle("deliverables")}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-2 h-auto"
                  >
                    <div className="flex items-center gap-2">
                      {dataSections.deliverables ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <span className="font-medium">Deliverables</span>
                      <Badge variant="secondary" className="ml-2">
                        {memoizedDataWithConditional.deliverables.length}
                      </Badge>
                    </div>
                    {loadingConditionalData.deliverables && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 pt-2">
                  {memoizedDataWithConditional.deliverables.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2">
                      {memoizedDataWithConditional.deliverables
                        .slice(0, 3)
                        .map((deliverable: any, index: number) => (
                          <div
                            key={deliverable._id || index}
                            className="p-2 border rounded text-sm"
                          >
                            <div className="font-medium">
                              {deliverable.title ||
                                deliverable.name ||
                                `Deliverable ${index + 1}`}
                            </div>
                            {deliverable.type && (
                              <div className="text-xs text-muted-foreground">
                                {deliverable.type}
                              </div>
                            )}
                          </div>
                        ))}
                      {memoizedDataWithConditional.deliverables.length > 3 && (
                        <div className="text-xs text-muted-foreground text-center">
                          and{" "}
                          {memoizedDataWithConditional.deliverables.length - 3}{" "}
                          more...
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-2">
                      No deliverables available
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* Galleries Section */}
              <Collapsible
                open={dataSections.galleries}
                onOpenChange={() => handleSectionToggle("galleries")}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-2 h-auto"
                  >
                    <div className="flex items-center gap-2">
                      {dataSections.galleries ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <span className="font-medium">Galleries</span>
                      <Badge variant="secondary" className="ml-2">
                        {memoizedDataWithConditional.galleries.length}
                      </Badge>
                    </div>
                    {loadingConditionalData.galleries && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 pt-2">
                  {memoizedDataWithConditional.galleries.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2">
                      {memoizedDataWithConditional.galleries
                        .slice(0, 3)
                        .map((gallery: any, index: number) => (
                          <div
                            key={gallery._id || index}
                            className="p-2 border rounded text-sm"
                          >
                            <div className="font-medium">
                              {gallery.title ||
                                gallery.name ||
                                `Gallery ${index + 1}`}
                            </div>
                            {gallery.imageCount && (
                              <div className="text-xs text-muted-foreground">
                                {gallery.imageCount} images
                              </div>
                            )}
                          </div>
                        ))}
                      {memoizedDataWithConditional.galleries.length > 3 && (
                        <div className="text-xs text-muted-foreground text-center">
                          and {memoizedDataWithConditional.galleries.length - 3}{" "}
                          more...
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-2">
                      No galleries available
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* Inspections Section */}
              <Collapsible
                open={dataSections.inspections}
                onOpenChange={() => handleSectionToggle("inspections")}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-2 h-auto"
                  >
                    <div className="flex items-center gap-2">
                      {dataSections.inspections ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <span className="font-medium">Inspections</span>
                      <Badge variant="secondary" className="ml-2">
                        {memoizedDataWithConditional.inspections.length}
                      </Badge>
                    </div>
                    {loadingConditionalData.inspections && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 pt-2">
                  {memoizedDataWithConditional.inspections.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2">
                      {memoizedDataWithConditional.inspections
                        .slice(0, 3)
                        .map((inspection: any, index: number) => (
                          <div
                            key={inspection._id || index}
                            className="p-2 border rounded text-sm"
                          >
                            <div className="font-medium">
                              {inspection.title ||
                                inspection.name ||
                                `Inspection ${index + 1}`}
                            </div>
                            {inspection.status && (
                              <div className="text-xs text-muted-foreground">
                                {inspection.status}
                              </div>
                            )}
                          </div>
                        ))}
                      {memoizedDataWithConditional.inspections.length > 3 && (
                        <div className="text-xs text-muted-foreground text-center">
                          and{" "}
                          {memoizedDataWithConditional.inspections.length - 3}{" "}
                          more...
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-2">
                      No inspections available
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

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
