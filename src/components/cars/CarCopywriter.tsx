"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "@/components/ui/use-toast";
import { CarSelection } from "../projects/caption-generator/CarSelection";
import { EventSelection } from "../projects/caption-generator/EventSelection";
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
import type { BaTCarDetails } from "@/types/car-page";
import type { Event } from "@/types/event";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { useAPI } from "@/hooks/useAPI";
import { useBrandTones } from "@/hooks/useBrandTones";

interface CarCopywriterProps {
  carId: string;
}

interface CarSavedCaption {
  _id: string;
  carId: string;
  platform: string;
  context: string;
  caption: string;
  createdAt: string;
}

export function CarCopywriter({ carId }: CarCopywriterProps) {
  const { user } = useFirebaseAuth();
  const api = useAPI();

  // Car-specific state
  const [carDetails, setCarDetails] = useState<BaTCarDetails | null>(null);
  const [loadingCar, setLoadingCar] = useState(true);
  const [carError, setCarError] = useState<string | null>(null);
  const [clientHandle, setClientHandle] = useState<string | null>(null);

  // Event-related state
  const [carEvents, setCarEvents] = useState<ProjectEvent[]>([]);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [eventDetails, setEventDetails] = useState<ProjectEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventsLimit, setEventsLimit] = useState(10);
  const [eventsHasMore, setEventsHasMore] = useState(false);

  // System prompts state
  const [systemPrompts, setSystemPrompts] = useState<any[]>([]);
  const [selectedSystemPromptId, setSelectedSystemPromptId] =
    useState<string>("");
  const [loadingSystemPrompts, setLoadingSystemPrompts] = useState(false);
  const [systemPromptError, setSystemPromptError] = useState<string | null>(
    null
  );

  // Length settings state
  const [lengthSettings, setLengthSettings] = useState<any[]>([]);

  // Brand tone state - Phase 2A
  const [selectedBrandToneId, setSelectedBrandToneId] = useState<string>("");
  const {
    brandTones,
    isLoading: loadingBrandTones,
    error: brandToneError,
  } = useBrandTones();

  // Saved captions state - managed locally with pagination
  const [savedCaptions, setSavedCaptions] = useState<CarSavedCaption[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingCaptionId, setEditingCaptionId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>("");
  const [captionsLimit, setCaptionsLimit] = useState(5);
  const [captionsHasMore, setCaptionsHasMore] = useState(false);

  // Content view mode state
  const [contentViewMode, setContentViewMode] = useState<"preview" | "saved">(
    "preview"
  );

  // LLM Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [editableLLMText, setEditableLLMText] = useState<string>("");

  // Form state management - must be called before any early returns
  const { formState, handlers: formHandlers } = useFormState();

  // Prompt handlers with callbacks to update form state - must be called before any early returns
  const promptHandlers = usePromptHandlers({
    formHandlers,
    formState,
  });

  // Derive length from selected prompt template (using promptHandlers state)
  const derivedLength = useMemo(() => {
    if (!promptHandlers.selectedPrompt) return null;

    // Try to find matching length setting
    const matchedLength = lengthSettings.find(
      (l) => l.key === promptHandlers.selectedPrompt?.length
    );

    if (matchedLength) return matchedLength;

    // Fallback: try to find "standard" as default
    const standardLength = lengthSettings.find((l) => l.key === "standard");

    if (standardLength) {
      console.warn(
        `🚨 CarCopywriter: Prompt template "${promptHandlers.selectedPrompt.name}" has invalid length "${promptHandlers.selectedPrompt.length}". Falling back to "standard".`
      );
      return standardLength;
    }

    // Last resort: use first available length setting
    if (lengthSettings.length > 0) {
      console.warn(
        `🚨 CarCopywriter: No "standard" length found. Using first available: "${lengthSettings[0].key}"`
      );
      return lengthSettings[0];
    }

    // Ultimate fallback: create a default length setting
    console.error(
      "🚨 CarCopywriter: No length settings available. Using hardcoded default."
    );
    return {
      key: "standard",
      name: "Standard",
      description: "2-3 lines",
      instructions: "Write a standard length caption of 2-3 lines.",
    };
  }, [promptHandlers.selectedPrompt, lengthSettings]);

  // Generation handlers - must be called before any early returns
  const { generationState, generateCaption, updateGeneratedCaption } =
    useGenerationHandlers();

  // Content saving - must be called before any early returns
  const { saveCaption } = useCaptionSaver();

  // Local caption management functions
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

  // Build LLM text for preview
  const buildLLMText = useCallback(() => {
    if (!carDetails || !selectedSystemPromptId) return "";

    let llmText = "";

    // Add system prompt context
    const systemPrompt = systemPrompts.find(
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
    llmText += "CAR SPECIFICATIONS:\n";
    llmText += `Year: ${carDetails.year}\n`;
    llmText += `Make: ${carDetails.make}\n`;
    llmText += `Model: ${carDetails.model}\n`;
    if (carDetails.color) llmText += `Color: ${carDetails.color}\n`;
    if (carDetails.mileage) llmText += `Mileage: ${carDetails.mileage}\n`;
    if (carDetails.vin) llmText += `VIN: ${carDetails.vin}\n`;
    if (carDetails.condition) llmText += `Condition: ${carDetails.condition}\n`;
    if (carDetails.interior_color)
      llmText += `Interior Color: ${carDetails.interior_color}\n`;
    if (carDetails.engine) {
      llmText += `Engine Type: ${carDetails.engine.type}\n`;
      if (carDetails.engine.displacement)
        llmText += `Engine Displacement: ${carDetails.engine.displacement}\n`;
      if (carDetails.engine.power?.hp)
        llmText += `Horsepower: ${carDetails.engine.power.hp}\n`;
    }
    if (carDetails.transmission?.type)
      llmText += `Transmission: ${carDetails.transmission.type}\n`;
    if (carDetails.description)
      llmText += `Description: ${carDetails.description}\n`;
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
    systemPrompts,
    selectedBrandToneId,
    brandTones,
    formState.context,
    formState.additionalContext,
    eventDetails,
    formState.platform,
    formState.tone,
    formState.style,
    derivedLength,
    formState.model,
    formState.temperature,
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
        additionalContext: formState.additionalContext, // Keep existing
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

  // Event selection handlers
  const handleEventSelection = useCallback((eventId: string) => {
    setSelectedEventIds((prev) => {
      if (prev.includes(eventId)) {
        return prev.filter((id) => id !== eventId);
      } else {
        return [...prev, eventId];
      }
    });
  }, []);

  const handleSelectAllEvents = useCallback(() => {
    if (selectedEventIds.length === carEvents.length) {
      setSelectedEventIds([]);
    } else {
      setSelectedEventIds(carEvents.map((event) => event.id));
    }
  }, [selectedEventIds.length, carEvents]);

  // Performance monitoring utility
  const logAPIPerformance = useCallback(
    (endpoint: string, startTime: number, data: any) => {
      const duration = performance.now() - startTime;
      const sizeInBytes = JSON.stringify(data).length;
      const sizeInKB = (sizeInBytes / 1024).toFixed(2);

      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`🚀 API Performance - ${endpoint}:`);
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`   Duration: ${duration.toFixed(2)}ms`);
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`   Payload Size: ${sizeInKB}KB (${sizeInBytes} bytes)`);
      console.log(
        `   Items Count: ${Array.isArray(data) ? data.length : "N/A"}`
      );

      // Flag potentially heavy responses
      if (duration > 1000) {
        console.warn(
          `⚠️  Slow API call detected: ${endpoint} took ${duration.toFixed(2)}ms`
        );
      }
      if (sizeInBytes > 100000) {
        // 100KB threshold
        console.warn(
          `⚠️  Large payload detected: ${endpoint} returned ${sizeInKB}KB`
        );
      }
    },
    []
  );

  // Load more events function
  const loadMoreEvents = useCallback(async () => {
    if (!api || loadingEvents || !eventsHasMore) return;

    setLoadingEvents(true);
    try {
      const startTime = performance.now();
      const newLimit = eventsLimit + 10;
      const additionalEvents = (await api.get(
        `cars/${carId}/events?limit=${newLimit}&skip=${eventsLimit}`
      )) as ProjectEvent[];
      logAPIPerformance(
        `cars/${carId}/events (load more)`,
        startTime,
        additionalEvents
      );

      if (additionalEvents.length === 0) {
        setEventsHasMore(false);
      } else {
        setCarEvents((prev) => [...prev, ...additionalEvents]);
        setEventsLimit(newLimit);
        setEventsHasMore(additionalEvents.length === 10); // Has more if we got full batch
      }
    } catch (error) {
      console.error("Error loading more events:", error);
    } finally {
      setLoadingEvents(false);
    }
  }, [
    api,
    carId,
    loadingEvents,
    eventsHasMore,
    eventsLimit,
    logAPIPerformance,
  ]);

  // Load more captions function
  const loadMoreCaptions = useCallback(async () => {
    if (!api || !captionsHasMore) return;

    try {
      const startTime = performance.now();
      const newLimit = captionsLimit + 5;
      const additionalCaptions = (await api.get(
        `captions?carId=${carId}&limit=${newLimit}&skip=${captionsLimit}&sort=-createdAt`
      )) as CarSavedCaption[];
      logAPIPerformance(`captions (load more)`, startTime, additionalCaptions);

      if (additionalCaptions.length === 0) {
        setCaptionsHasMore(false);
      } else {
        setSavedCaptions((prev) => [...prev, ...additionalCaptions]);
        setCaptionsLimit(newLimit);
        setCaptionsHasMore(additionalCaptions.length === 5); // Has more if we got full batch
      }
    } catch (error) {
      console.error("Error loading more captions:", error);
    }
  }, [api, carId, captionsHasMore, captionsLimit, logAPIPerformance]);

  // Helper function to refetch saved captions when needed
  const fetchSavedCaptions = useCallback(async () => {
    if (!api) return;

    try {
      const data = (await api.get(
        `captions?carId=${carId}`
      )) as CarSavedCaption[];
      setSavedCaptions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching captions:", error);
    }
  }, [api, carId]);

  // Fetch event details when selected events change
  const fetchEventDetails = useCallback(async () => {
    try {
      const eventDetailsData = selectedEventIds
        .map((eventId) => {
          return carEvents.find((event) => event.id === eventId);
        })
        .filter(Boolean) as ProjectEvent[];

      setEventDetails(eventDetailsData);
    } catch (error) {
      console.error("Error fetching event details:", error);
    }
  }, [selectedEventIds, carEvents]);

  // Handle system prompt change
  const handleSystemPromptChange = useCallback((promptId: string) => {
    setSelectedSystemPromptId(promptId);
  }, []);

  // Convert car details to project car format for compatibility
  const projectCars: ProjectCar[] = carDetails
    ? [
        {
          _id: carDetails._id,
          year: carDetails.year,
          make: carDetails.make,
          model: carDetails.model,
          color: carDetails.color,
          vin: carDetails.vin,
          status: "available", // Default status for individual car
          primaryImageId: (carDetails as any).primaryImageId,
          createdAt: new Date().toISOString(), // Default createdAt
        },
      ]
    : [];

  const selectedCarIds = carDetails ? [carDetails._id] : [];

  const handleGenerateContent = async () => {
    if (!carDetails) return;

    const context: GenerationContext = {
      projectId: "", // Empty string instead of null for individual car
      selectedCarIds: [carDetails._id],
      selectedModelIds: [], // Individual car doesn't support models
      selectedEventIds,
      selectedSystemPromptId,
      carDetails: [carDetails],
      modelDetails: [], // Individual car doesn't support models
      eventDetails,
      derivedLength,
      useMinimalCarData: false,
      editableLLMText,
      clientHandle,
    };

    await generateCaption(context, formState);
  };

  const handleSaveContent = async () => {
    if (!carDetails || !api) return;

    const contentToSave = generationState.generatedCaption;
    if (!contentToSave.trim()) return;

    try {
      await api.post("captions", {
        platform: formState.platform,
        carId: carDetails._id,
        context: formState.context,
        caption: contentToSave,
      });

      toast({
        title: "Success",
        description: "Caption saved successfully",
      });

      // Refresh saved captions
      await fetchSavedCaptions();
      // Switch to saved view to show the newly saved content
      setContentViewMode("saved");
    } catch (error) {
      console.error("Error saving caption:", error);
      toast({
        title: "Error",
        description: "Failed to save caption",
        variant: "destructive",
      });
    }
  };

  const handleUpdatePreviewContent = (newContent: string) => {
    updateGeneratedCaption(newContent);
  };

  const handleDeleteContent = async (contentId: string) => {
    if (!api) return;

    try {
      await api.delete(`captions/${contentId}?carId=${carDetails?._id}`);

      toast({
        title: "Success",
        description: "Caption deleted successfully",
      });

      // Refresh saved captions by fetching them again
      try {
        const refreshedCaptions = (await api.get(
          `captions?carId=${carId}&limit=${captionsLimit}&sort=-createdAt`
        )) as CarSavedCaption[];
        setSavedCaptions(
          Array.isArray(refreshedCaptions) ? refreshedCaptions : []
        );
        setCaptionsHasMore((refreshedCaptions || []).length === captionsLimit);
      } catch (refreshError) {
        console.error("Error refreshing captions:", refreshError);
      }
    } catch (error) {
      console.error("Error deleting caption:", error);
      toast({
        title: "Error",
        description: "Failed to delete caption",
        variant: "destructive",
      });
    }
  };

  const handleSaveEdit = async (contentId: string) => {
    if (!api) return;

    try {
      const captionToEdit = savedCaptions.find((c) => c._id === contentId);
      if (!captionToEdit) {
        throw new Error("Caption not found");
      }

      await api.patch(`captions/${contentId}`, {
        caption: editingText,
        platform: captionToEdit.platform,
        context: captionToEdit.context || "",
      });

      toast({
        title: "Success",
        description: "Caption updated successfully",
      });

      // Refresh saved captions by fetching them again
      try {
        const refreshedCaptions = (await api.get(
          `captions?carId=${carId}&limit=${captionsLimit}&sort=-createdAt`
        )) as CarSavedCaption[];
        setSavedCaptions(
          Array.isArray(refreshedCaptions) ? refreshedCaptions : []
        );
        setCaptionsHasMore((refreshedCaptions || []).length === captionsLimit);
      } catch (refreshError) {
        console.error("Error refreshing captions:", refreshError);
      }
      handleCancelEdit();
    } catch (error) {
      console.error("Error updating caption:", error);
      toast({
        title: "Error",
        description: "Failed to update caption",
        variant: "destructive",
      });
    }
  };

  // Convert car captions to project caption format for CaptionPreview component
  const projectSavedCaptions: ProjectSavedCaption[] = savedCaptions.map(
    (caption) => ({
      _id: caption._id,
      platform: caption.platform,
      context: caption.context,
      caption: caption.caption,
      projectId: "", // Empty for individual car
      carIds: [caption.carId],
      eventIds: [],
      createdAt: caption.createdAt,
    })
  );

  // Main data fetching effect
  useEffect(() => {
    if (!api || !carId) return;

    const fetchAllData = async () => {
      console.time("CarCopywriter-parallel-fetch");
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`🎯 Starting CarCopywriter data fetch for car: ${carId}`);

      try {
        // OPTIMIZATION 1 & 2: Add limits to events and captions API calls
        // OPTIMIZATION 3: Remove client handle from Promise.all() to make it truly non-blocking
        const parallelFetchStart = performance.now();

        const [
          carData,
          carEventsData,
          systemPromptsData,
          lengthSettingsData,
          savedCaptionsData,
        ] = await Promise.all([
          // Car details
          (async () => {
            const start = performance.now();
            const data = (await api.get(`cars/${carId}`)) as BaTCarDetails & {
              client?: string;
              clientId?: string;
              clientInfo?: { _id: string };
            };
            logAPIPerformance(`cars/${carId}`, start, data);
            return data;
          })(),

          // Events with limit - OPTIMIZATION 1
          (async () => {
            const start = performance.now();
            const data = (await api.get(
              `cars/${carId}/events?limit=${eventsLimit}`
            )) as ProjectEvent[];
            logAPIPerformance(`cars/${carId}/events`, start, data);
            return data;
          })(),

          // System prompts
          (async () => {
            const start = performance.now();
            const data = (await api.get("system-prompts/list")) as any[];
            logAPIPerformance("system-prompts/list", start, data);
            return data;
          })(),

          // Length settings
          (async () => {
            const start = performance.now();
            const data = (await api.get("length-settings")) as any[];
            logAPIPerformance("length-settings", start, data);
            return data;
          })(),

          // Captions with pagination - OPTIMIZATION 2
          (async () => {
            const start = performance.now();
            const data = (await api.get(
              `captions?carId=${carId}&limit=${captionsLimit}&sort=-createdAt`
            )) as CarSavedCaption[];
            logAPIPerformance(`captions`, start, data);
            return data;
          })(),
        ]);

        const parallelFetchDuration = performance.now() - parallelFetchStart;
        console.log(
          `⚡ Parallel fetch completed in: ${parallelFetchDuration.toFixed(2)}ms`
        );

        // Process car data
        setCarDetails(carData);
        setCarError(null);

        // OPTIMIZATION 1: Remove frontend slicing since we now limit on API
        // Check if there are more events to load
        setCarEvents(carEventsData || []);
        setEventsHasMore((carEventsData || []).length === eventsLimit);

        // PERFORMANCE: Filter active prompts on frontend
        const allPrompts = Array.isArray(systemPromptsData)
          ? systemPromptsData
          : [];
        setSystemPrompts(allPrompts);
        const activePrompt = allPrompts.find((prompt: any) => prompt.isActive);
        if (activePrompt) {
          setSelectedSystemPromptId(activePrompt._id);
        } else if (allPrompts.length > 0) {
          setSelectedSystemPromptId(allPrompts[0]._id);
        }

        // Process length settings
        setLengthSettings(
          Array.isArray(lengthSettingsData) ? lengthSettingsData : []
        );

        // OPTIMIZATION 2: Remove frontend slicing since we now paginate on API
        // Check if there are more captions to load
        setSavedCaptions(
          Array.isArray(savedCaptionsData) ? savedCaptionsData : []
        );
        setCaptionsHasMore((savedCaptionsData || []).length === captionsLimit);

        // OPTIMIZATION 3: Fetch client handle asynchronously and truly non-blocking
        // Move this outside Promise.all() and make it completely independent
        const clientId =
          carData.client || carData.clientId || carData.clientInfo?._id;
        if (clientId) {
          // Fetch client handle completely independently without blocking main UI
          const fetchClientHandle = async () => {
            try {
              const clientStart = performance.now();
              const client = (await api.get(`clients/${clientId}`)) as any;
              logAPIPerformance(`clients/${clientId}`, clientStart, client);

              if (client.socialMedia?.instagram) {
                setClientHandle(
                  `@${client.socialMedia.instagram.replace(/^@/, "")}`
                );
              }
            } catch (clientError) {
              console.error("Error fetching client handle:", clientError);
              setClientHandle(null);
            }
          };

          // Start client fetch immediately without waiting
          fetchClientHandle();
        }
      } catch (error) {
        console.error("Error in parallel fetch:", error);
        setCarError("Failed to fetch car data");
      } finally {
        console.timeEnd("CarCopywriter-parallel-fetch");
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`✅ CarCopywriter data fetch completed for car: ${carId}`);
        setLoadingCar(false);
        setLoadingEvents(false);
        setLoadingSystemPrompts(false);
      }
    };

    fetchAllData();
  }, [api, carId, eventsLimit, captionsLimit, logAPIPerformance]);

  // Fetch prompts separately to avoid conflicts with other prompt management
  useEffect(() => {
    promptHandlers.fetchPrompts();
  }, [promptHandlers.fetchPrompts]);

  // Fetch event details when selected events change
  useEffect(() => {
    if (selectedEventIds.length > 0) {
      fetchEventDetails();
    } else {
      setEventDetails([]);
    }
  }, [selectedEventIds, fetchEventDetails]);

  // Loading check moved to the end - after all hooks have been called
  if (!api) {
    return (
      <div className="py-8 text-center text-muted-foreground">Loading...</div>
    );
  }

  if (loadingCar) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Loading car details...
      </div>
    );
  }

  if (carError) {
    return (
      <div className="py-8 text-center text-destructive-500">{carError}</div>
    );
  }

  if (!carDetails) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Car not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[calc(100vh-200px)]">
        {/* Left Column - Configuration */}
        <div className="space-y-6">
          {/* Car Selection - Show current car as selected */}
          <CarSelection
            projectCars={projectCars}
            selectedCarIds={selectedCarIds}
            loadingCars={loadingCar}
            onCarSelection={() => {}} // No-op for single car
            onSelectAllCars={() => {}} // No-op for single car
          />

          {/* Event Selection - Show car events if available */}
          <EventSelection
            projectEvents={carEvents}
            selectedEventIds={selectedEventIds}
            loadingEvents={loadingEvents}
            onEventSelection={handleEventSelection}
            onSelectAllEvents={handleSelectAllEvents}
            hasMoreEvents={eventsHasMore}
            onLoadMoreEvents={loadMoreEvents}
          />

          {/* System Prompt Selection */}
          <SystemPromptSelection
            systemPrompts={systemPrompts}
            selectedSystemPromptId={selectedSystemPromptId}
            loadingSystemPrompts={loadingSystemPrompts}
            systemPromptError={systemPromptError}
            onSystemPromptChange={handleSystemPromptChange}
          />

          {/* Brand Tone Selection - Phase 2A */}
          <BrandToneSelection
            brandTones={brandTones}
            selectedBrandToneId={selectedBrandToneId}
            loadingBrandTones={loadingBrandTones}
            brandToneError={brandToneError ? String(brandToneError) : null}
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
            useMinimalCarData={false}
            onUseMinimalCarDataChange={() => {}}
            showPreview={showPreview}
            onShowPreviewToggle={handleShowPreviewToggle}
            editableLLMText={editableLLMText}
            onEditableLLMTextChange={setEditableLLMText}
            onRefreshLLMText={handleRefreshLLMText}
            selectedSystemPromptId={selectedSystemPromptId}
            systemPrompts={systemPrompts}
            projectCars={projectCars}
            projectEvents={carEvents}
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
            savedCaptions={projectSavedCaptions}
            editingCaptionId={editingCaptionId}
            editingText={editingText}
            onStartEdit={handleStartEdit}
            onCancelEdit={handleCancelEdit}
            onSaveEdit={handleSaveEdit}
            onEditTextChange={handleEditTextChange}
            onDeleteCaption={handleDeleteContent}
            onUpdatePreviewCaption={handleUpdatePreviewContent}
            hasMoreCaptions={captionsHasMore}
            onLoadMoreCaptions={loadMoreCaptions}
            loadingCaptions={false}
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
        clientHandle={clientHandle}
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
