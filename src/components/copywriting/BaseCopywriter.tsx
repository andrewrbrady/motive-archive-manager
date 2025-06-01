"use client";

import React, { useState, useEffect, useCallback } from "react";
import { toast } from "@/components/ui/use-toast";
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
import { CarTabSkeleton } from "@/components/ui/CarTabSkeleton";

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

export function BaseCopywriter({ config, callbacks }: BaseCopywriterProps) {
  const { user } = useFirebaseAuth();

  // Data state
  const [data, setData] = useState<CopywriterData>({
    cars: [],
    events: [],
    systemPrompts: [],
    lengthSettings: [],
    savedCaptions: [],
    clientHandle: null,
  });

  // Loading states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  const derivedLength = promptHandlers.selectedPrompt
    ? data.lengthSettings.find(
        (l) => l.key === promptHandlers.selectedPrompt?.length
      ) || null
    : null;

  // Generation handlers - must be called before any early returns
  const { generationState, generateCaption, updateGeneratedCaption } =
    useGenerationHandlers();

  // Content saving - must be called before any early returns
  const { saveCaption } = useCaptionSaver();

  // Initialize data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const fetchedData = await callbacks.onDataFetch();
        setData(fetchedData);

        console.log("BaseCopywriter: Received data:", {
          carsCount: fetchedData.cars.length,
          eventsCount: fetchedData.events.length,
          systemPromptsCount: fetchedData.systemPrompts.length,
          lengthSettingsCount: fetchedData.lengthSettings.length,
          savedCaptionsCount: fetchedData.savedCaptions.length,
          systemPromptsFirst: fetchedData.systemPrompts[0],
        });

        // Auto-select all cars for single car mode
        if (config.mode === "car" && fetchedData.cars.length === 1) {
          setSelectedCarIds([fetchedData.cars[0]._id]);
          setCarDetails(fetchedData.cars);
        }
      } catch (err) {
        console.error("Error fetching copywriter data:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [config.entityId]);

  // Fetch prompts when component mounts
  useEffect(() => {
    console.log("BaseCopywriter: useEffect calling fetchPrompts...");
    promptHandlers.fetchPrompts();
  }, [promptHandlers.fetchPrompts]);

  // Debug logging for system prompts
  useEffect(() => {
    console.log("BaseCopywriter: System prompts data updated:", {
      count: data.systemPrompts.length,
      prompts: data.systemPrompts,
      loading,
      error,
    });
  }, [data.systemPrompts, loading, error]);

  // Event selection handlers
  const handleEventSelection = useCallback(
    (eventId: string) => {
      setSelectedEventIds((prev) => {
        const newSelection = prev.includes(eventId)
          ? prev.filter((id) => id !== eventId)
          : [...prev, eventId];

        // Update event details based on selection
        const details = data.events.filter((event) =>
          newSelection.includes(event.id)
        );
        setEventDetails(details);

        return newSelection;
      });
    },
    [data.events]
  );

  const handleSelectAllEvents = useCallback(() => {
    const allEventIds = data.events.map((event) => event.id);
    setSelectedEventIds(allEventIds);
    setEventDetails(data.events);
  }, [data.events]);

  // Load more events handler
  const handleLoadMoreEvents = useCallback(async () => {
    if (loadingMoreEvents || !data.hasMoreEvents) return;

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
  }, [loadingMoreEvents, data.hasMoreEvents]);

  // Car selection handlers (for multi-car mode)
  const handleCarSelection = useCallback(
    (carId: string) => {
      if (!config.features.allowMultipleCars) return;

      setSelectedCarIds((prev) => {
        const newSelection = prev.includes(carId)
          ? prev.filter((id) => id !== carId)
          : [...prev, carId];

        // Update car details based on selection
        const details = data.cars.filter((car) =>
          newSelection.includes(car._id)
        );
        setCarDetails(details);

        return newSelection;
      });
    },
    [data.cars, config.features.allowMultipleCars]
  );

  const handleSelectAllCars = useCallback(() => {
    if (!config.features.allowMultipleCars) return;

    const allCarIds = data.cars.map((car) => car._id);
    setSelectedCarIds(allCarIds);
    setCarDetails(data.cars);
  }, [data.cars, config.features.allowMultipleCars]);

  // System prompt handler
  const handleSystemPromptChange = useCallback((promptId: string) => {
    setSelectedSystemPromptId(promptId);
  }, []);

  // LLM preview handlers
  const buildLLMText = useCallback(() => {
    if (carDetails.length === 0 || !selectedSystemPromptId) return "";

    let llmText = "";

    // Add system prompt context
    const systemPrompt = data.systemPrompts.find(
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
      // Add more car details as needed
    } else if (carDetails.length > 1) {
      llmText += "SELECTED CARS:\n";
      carDetails.forEach((car, index) => {
        llmText += `Car ${index + 1}: ${car.year} ${car.make} ${car.model}\n`;
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
    data.systemPrompts,
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
      clientHandle: data.clientHandle || null,
    };

    await generateCaption(context, formState);
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

    const success = await callbacks.onSaveCaption(captionData);
    if (success) {
      await callbacks.onRefresh();
      setContentViewMode("saved");
    }
  };

  const handleDeleteContent = async (contentId: string) => {
    const success = await callbacks.onDeleteCaption(contentId);
    if (success) {
      await callbacks.onRefresh();
    }
  };

  const handleSaveEdit = async (contentId: string) => {
    const success = await callbacks.onUpdateCaption(contentId, editingText);
    if (success) {
      await callbacks.onRefresh();
      handleCancelEdit();
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
    if (loadingMoreCaptions || !data.hasMoreCaptions) return;

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
  }, [loadingMoreCaptions, data.hasMoreCaptions]);

  if (loading) {
    return <CarTabSkeleton variant="form" />;
  }

  if (error) {
    return <div className="py-8 text-center text-destructive-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[calc(100vh-200px)]">
        {/* Left Column - Configuration */}
        <div className="space-y-6">
          {/* Car Selection */}
          <CarSelection
            projectCars={data.cars}
            selectedCarIds={selectedCarIds}
            loadingCars={loading}
            onCarSelection={handleCarSelection}
            onSelectAllCars={handleSelectAllCars}
          />

          {/* Event Selection */}
          {config.features.allowEventSelection && (
            <EventSelection
              projectEvents={data.events}
              selectedEventIds={selectedEventIds}
              loadingEvents={loading || loadingMoreEvents}
              onEventSelection={handleEventSelection}
              onSelectAllEvents={handleSelectAllEvents}
              hasMoreEvents={data.hasMoreEvents}
              onLoadMoreEvents={handleLoadMoreEvents}
            />
          )}

          {/* System Prompt Selection */}
          <SystemPromptSelection
            systemPrompts={data.systemPrompts}
            selectedSystemPromptId={selectedSystemPromptId}
            loadingSystemPrompts={loading}
            systemPromptError={error}
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
            systemPrompts={data.systemPrompts}
            projectCars={data.cars}
            projectEvents={data.events}
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
            savedCaptions={data.savedCaptions}
            editingCaptionId={editingCaptionId}
            editingText={editingText}
            onStartEdit={handleStartEdit}
            onCancelEdit={handleCancelEdit}
            onSaveEdit={handleSaveEdit}
            onEditTextChange={handleEditTextChange}
            onDeleteCaption={handleDeleteContent}
            onUpdatePreviewCaption={handleUpdatePreviewContent}
            hasMoreCaptions={data.hasMoreCaptions}
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
        clientHandle={data.clientHandle || null}
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
