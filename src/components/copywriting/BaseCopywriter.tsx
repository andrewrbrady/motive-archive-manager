"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAPIQuery } from "@/hooks/useAPIQuery";
import { toast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  // Load more flags
  hasMoreEvents?: boolean;
  hasMoreCaptions?: boolean;
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
 * Part of Phase 1 optimization - uses shared useAPIQuery for system data
 * Prevents duplicate API calls between car and project copywriters
 */
export function BaseCopywriter({ config, callbacks }: BaseCopywriterProps) {
  const { user } = useFirebaseAuth();

  // Shared cache strategy - Use direct useAPIQuery for system data that's common across all copywriters
  const {
    data: sharedSystemPrompts,
    isLoading: isLoadingSharedSystemPrompts,
    error: sharedSystemPromptsError,
  } = useAPIQuery<any[]>(`system-prompts/active`, {
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
  const memoizedData = useMemo(() => {
    // Ensure arrays are properly initialized to prevent .map() errors
    const safeSystemPrompts = Array.isArray(sharedSystemPrompts)
      ? sharedSystemPrompts
      : [];
    const safeLengthSettings = Array.isArray(sharedLengthSettings)
      ? sharedLengthSettings
      : [];
    const safeCars = Array.isArray(entityData?.cars) ? entityData.cars : [];
    const safeEvents = Array.isArray(entityData?.events)
      ? entityData.events
      : [];
    const safeSavedCaptions = Array.isArray(entityData?.savedCaptions)
      ? entityData.savedCaptions
      : [];

    return {
      cars: safeCars,
      events: safeEvents,
      systemPrompts: safeSystemPrompts, // Always ensure this is an array
      lengthSettings: safeLengthSettings, // Always ensure this is an array
      savedCaptions: safeSavedCaptions,
      clientHandle: entityData?.clientHandle || null,
      hasMoreEvents: entityData?.hasMoreEvents || false,
      hasMoreCaptions: entityData?.hasMoreCaptions || false,
    };
  }, [entityData, sharedSystemPrompts, sharedLengthSettings]);

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
    const matchedLength = memoizedData.lengthSettings.find(
      (l) => l.key === promptHandlers.selectedPrompt?.length
    );

    if (matchedLength) return matchedLength;

    // Fallback: try to find "standard" as default
    const standardLength = memoizedData.lengthSettings.find(
      (l) => l.key === "standard"
    );

    if (standardLength) {
      console.warn(
        `🚨 BaseCopywriter: Prompt template "${promptHandlers.selectedPrompt.name}" has invalid length "${promptHandlers.selectedPrompt.length}". Falling back to "standard".`
      );
      return standardLength;
    }

    // Last resort: use first available length setting
    if (memoizedData.lengthSettings.length > 0) {
      console.warn(
        `🚨 BaseCopywriter: No "standard" length found. Using first available: "${memoizedData.lengthSettings[0].key}"`
      );
      return memoizedData.lengthSettings[0];
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
  }, [promptHandlers.selectedPrompt, memoizedData.lengthSettings]);

  // Generation handlers - must be called before any early returns
  const { generationState, generateCaption, updateGeneratedCaption } =
    useGenerationHandlers();

  // Content saving - must be called before any early returns
  const { saveCaption } = useCaptionSaver();

  // Auto-select car for single car mode
  React.useEffect(() => {
    if (
      config.mode === "car" &&
      memoizedData.cars.length === 1 &&
      selectedCarIds.length === 0
    ) {
      setSelectedCarIds([memoizedData.cars[0]._id]);
      setCarDetails(memoizedData.cars);
    }
  }, [config.mode, memoizedData.cars, selectedCarIds.length]);

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
        value: memoizedData.systemPrompts,
        isArray: Array.isArray(memoizedData.systemPrompts),
        length: memoizedData.systemPrompts.length,
      },
      loading: isLoading,
      error: hasError,
    });
  }, [memoizedData.systemPrompts, sharedSystemPrompts, isLoading, hasError]);

  // Event selection handlers
  const handleEventSelection = useCallback(
    (eventId: string) => {
      setSelectedEventIds((prev) => {
        const newSelection = prev.includes(eventId)
          ? prev.filter((id) => id !== eventId)
          : [...prev, eventId];

        // Update event details based on selection
        const details = memoizedData.events.filter((event) =>
          newSelection.includes(event.id)
        );
        setEventDetails(details);

        return newSelection;
      });
    },
    [memoizedData.events]
  );

  const handleSelectAllEvents = useCallback(() => {
    const allEventIds = memoizedData.events.map((event) => event.id);
    setSelectedEventIds(allEventIds);
    setEventDetails(memoizedData.events);
  }, [memoizedData.events]);

  // Load more events handler
  const handleLoadMoreEvents = useCallback(async () => {
    if (loadingMoreEvents || !memoizedData.hasMoreEvents) return;

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
  }, [loadingMoreEvents, memoizedData.hasMoreEvents]);

  // Car selection handlers (for multi-car mode)
  const handleCarSelection = useCallback(
    (carId: string) => {
      if (!config.features.allowMultipleCars) return;

      setSelectedCarIds((prev) => {
        const newSelection = prev.includes(carId)
          ? prev.filter((id) => id !== carId)
          : [...prev, carId];

        // Update car details based on selection
        const details = memoizedData.cars.filter((car) =>
          newSelection.includes(car._id)
        );
        setCarDetails(details);

        return newSelection;
      });
    },
    [memoizedData.cars, config.features.allowMultipleCars]
  );

  const handleSelectAllCars = useCallback(() => {
    if (!config.features.allowMultipleCars) return;

    const allCarIds = memoizedData.cars.map((car) => car._id);
    setSelectedCarIds(allCarIds);
    setCarDetails(memoizedData.cars);
  }, [memoizedData.cars, config.features.allowMultipleCars]);

  // System prompt handler
  const handleSystemPromptChange = useCallback((promptId: string) => {
    setSelectedSystemPromptId(promptId);
  }, []);

  // LLM preview handlers
  const buildLLMText = useCallback(() => {
    if (carDetails.length === 0 || !selectedSystemPromptId) return "";

    let llmText = "";

    // Add system prompt context
    const systemPrompt = memoizedData.systemPrompts.find(
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
    memoizedData.systemPrompts,
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
  const handleCopy = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast({
        title: "Copied",
        description: "Caption copied to clipboard",
      });
    } catch (error) {
      console.error("Failed to copy:", error);
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
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
      clientHandle: memoizedData.clientHandle || null,
    };

    // Phase 3C FIX: Remove blocking await from background operations
    const generateOperation = () => {
      generateCaption(context, formState).catch((error) => {
        console.error("Error generating caption:", error);
        // Error handling is already in generateCaption
      });
    };

    // Execute generation in background - truly non-blocking
    setTimeout(generateOperation, 0);

    // Immediate feedback for better UX
    toast({
      title: "Generating...",
      description: "Caption is being generated in background",
    });
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
    // Phase 3C FIX: Remove blocking await from background operations
    const saveEditOperation = () => {
      callbacks
        .onUpdateCaption(contentId, editingText)
        .then((success) => {
          if (success) {
            callbacks.onRefresh().catch((error) => {
              console.error("Error refreshing after update:", error);
            });
            handleCancelEdit();
            toast({
              title: "Success",
              description: "Caption updated and refreshed successfully",
            });
          }
        })
        .catch((error) => {
          console.error("Error updating caption:", error);
          // Error handling is already in callbacks
        });
    };

    // Execute update operation in background - truly non-blocking
    setTimeout(saveEditOperation, 0);

    // Immediate optimistic feedback and close edit mode
    handleCancelEdit();
    toast({
      title: "Updating...",
      description: "Caption is being updated in background",
    });
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
    if (loadingMoreCaptions || !memoizedData.hasMoreCaptions) return;

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
  }, [loadingMoreCaptions, memoizedData.hasMoreCaptions]);

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
            projectCars={memoizedData.cars}
            selectedCarIds={selectedCarIds}
            loadingCars={isLoading}
            onCarSelection={handleCarSelection}
            onSelectAllCars={handleSelectAllCars}
          />

          {/* Event Selection */}
          {config.features.allowEventSelection && (
            <EventSelection
              projectEvents={memoizedData.events}
              selectedEventIds={selectedEventIds}
              loadingEvents={isLoading || loadingMoreEvents}
              onEventSelection={handleEventSelection}
              onSelectAllEvents={handleSelectAllEvents}
              hasMoreEvents={memoizedData.hasMoreEvents}
              onLoadMoreEvents={handleLoadMoreEvents}
            />
          )}

          {/* System Prompt Selection */}
          <SystemPromptSelection
            systemPrompts={memoizedData.systemPrompts}
            selectedSystemPromptId={selectedSystemPromptId}
            loadingSystemPrompts={isLoading}
            systemPromptError={
              sharedSystemPromptsError ? String(sharedSystemPromptsError) : null
            }
            onSystemPromptChange={handleSystemPromptChange}
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
            systemPrompts={memoizedData.systemPrompts}
            projectCars={memoizedData.cars}
            projectEvents={memoizedData.events}
            model={formState.model}
            temperature={formState.temperature}
            isGenerating={generationState.isGenerating}
            onGenerate={handleGenerateContent}
            error={generationState.error}
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
            savedCaptions={memoizedData.savedCaptions}
            editingCaptionId={editingCaptionId}
            editingText={editingText}
            onStartEdit={handleStartEdit}
            onCancelEdit={handleCancelEdit}
            onSaveEdit={handleSaveEdit}
            onEditTextChange={handleEditTextChange}
            onDeleteCaption={handleDeleteContent}
            onUpdatePreviewCaption={handleUpdatePreviewContent}
            hasMoreCaptions={memoizedData.hasMoreCaptions}
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
        clientHandle={memoizedData.clientHandle || null}
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
