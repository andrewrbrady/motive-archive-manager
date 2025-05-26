"use client";

import React, { useState, useEffect, useCallback } from "react";
import { toast } from "@/components/ui/use-toast";
import { CarSelection } from "./caption-generator/CarSelection";
import { EventSelection } from "./caption-generator/EventSelection";
import { SystemPromptSelection } from "./caption-generator/SystemPromptSelection";
import { CaptionPreview } from "./caption-generator/CaptionPreview";
import { GenerationControls } from "./caption-generator/GenerationControls";
import { PromptEditModal } from "./caption-generator/PromptEditModal";
import { useProjectData } from "./caption-generator/useProjectData";
import {
  usePromptHandlers,
  useFormState,
  useGenerationHandlers,
  useCaptionSaver,
  useSavedCaptions,
  type PromptFormValues,
  type GenerationContext,
} from "./caption-generator/handlers";
import type { Project } from "@/types/project";
import type {
  PromptTemplate,
  Tone,
  Style,
  Platform,
} from "./caption-generator/types";
import type { ProviderId } from "@/lib/llmProviders";

interface RevisedProjectCaptionGeneratorProps {
  project: Project;
  onProjectUpdate: () => void;
}

export function RevisedProjectCaptionGenerator({
  project,
  onProjectUpdate,
}: RevisedProjectCaptionGeneratorProps) {
  // Client handle state
  const [clientHandle, setClientHandle] = useState<string | null>(null);

  // Caption preview view mode state
  const [captionViewMode, setCaptionViewMode] = useState<"preview" | "saved">(
    "preview"
  );

  // Form state management - must be called before any early returns
  const { formState, handlers: formHandlers } = useFormState();

  // Prompt handlers with callbacks to update form state - must be called before any early returns
  const promptHandlers = usePromptHandlers({
    formHandlers,
    formState,
  });

  // Use project data hook - must be called before any early returns
  const projectDataHook = useProjectData({ projectId: project._id || "" });

  // Derive length from selected prompt template (using promptHandlers state)
  const derivedLength = promptHandlers.selectedPrompt
    ? projectDataHook.lengthSettings.find(
        (l) => l.key === promptHandlers.selectedPrompt?.length
      ) || null
    : null;

  // Generation handlers - must be called before any early returns
  const { generationState, generateCaption, updateGeneratedCaption } =
    useGenerationHandlers();

  // Caption saving - must be called before any early returns
  const { saveCaption } = useCaptionSaver();

  // Saved captions management - must be called before any early returns
  const savedCaptionsHook = useSavedCaptions();

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

  // Fetch prompts when component mounts - must be called before any early returns
  useEffect(() => {
    promptHandlers.fetchPrompts();
  }, []);

  // Initialize savedCaptionsHook with project captions - must be called before any early returns
  useEffect(() => {
    if (projectDataHook.savedCaptions) {
      savedCaptionsHook.setSavedCaptions(projectDataHook.savedCaptions);
    }
  }, [projectDataHook.savedCaptions]);

  // Guard against missing project ID - AFTER all hooks are called
  if (!project._id) {
    return (
      <div className="text-center py-8 text-[hsl(var(--foreground-muted))]">
        <p>Project ID is required to generate captions.</p>
      </div>
    );
  }

  const {
    // Car data
    projectCars,
    selectedCarIds,
    carDetails,
    loadingCars,
    handleCarSelection,
    handleSelectAllCars,

    // Event data
    projectEvents,
    selectedEventIds,
    eventDetails,
    loadingEvents,
    handleEventSelection,
    handleSelectAllEvents,

    // System prompt data
    systemPrompts,
    selectedSystemPromptId,
    loadingSystemPrompts,
    systemPromptError,
    handleSystemPromptChange,

    // Length settings
    lengthSettings,

    // Saved captions
    savedCaptions,

    // Data filtering
    useMinimalCarData,
    handleUseMinimalCarDataChange,

    // LLM Preview
    showPreview,
    editableLLMText,
    setEditableLLMText,
    handleShowPreviewToggle,
    handleRefreshLLMText,
    buildLLMText,

    // Refetch functions
    refetchCars,
    refetchEvents,
    refetchSystemPrompts,
    refetchPromptTemplates,
    refetchCaptions,
  } = projectDataHook;

  const handleGenerate = async () => {
    const context: GenerationContext = {
      projectId: project._id!,
      selectedCarIds,
      selectedEventIds,
      selectedSystemPromptId,
      carDetails,
      eventDetails,
      derivedLength,
      useMinimalCarData,
      editableLLMText,
      clientHandle,
    };

    await generateCaption(context, formState);
  };

  const handleSaveCaption = async () => {
    const captionToSave = generationState.generatedCaption;
    if (!captionToSave) return;

    const success = await saveCaption(
      project._id!,
      captionToSave,
      formState.platform,
      formState.context,
      selectedCarIds,
      selectedEventIds
    );

    if (success) {
      // Refresh saved captions from the project
      await refetchCaptions();
      // Switch to saved view to show the newly saved caption
      setCaptionViewMode("saved");
    }
  };

  const handleUpdatePreviewCaption = (newCaption: string) => {
    // Update the generated caption state when preview is edited
    updateGeneratedCaption(newCaption);
  };

  const handleDeleteCaption = async (captionId: string) => {
    const success = await savedCaptionsHook.handleDeleteCaption(
      project._id!,
      captionId
    );
    if (success) {
      // Refresh saved captions from the project to sync state
      await refetchCaptions();
    }
  };

  const handleSaveEdit = async (captionId: string) => {
    const success = await savedCaptionsHook.handleSaveEdit(
      project._id!,
      captionId
    );
    if (success) {
      // Refresh saved captions from the project to sync state
      await refetchCaptions();
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[calc(100vh-200px)]">
        {/* Left Column - Configuration */}
        <div className="space-y-6">
          {/* Car Selection */}
          <CarSelection
            projectCars={projectCars}
            selectedCarIds={selectedCarIds}
            loadingCars={loadingCars}
            onCarSelection={handleCarSelection}
            onSelectAllCars={handleSelectAllCars}
          />

          {/* Event Selection */}
          <EventSelection
            projectEvents={projectEvents}
            selectedEventIds={selectedEventIds}
            loadingEvents={loadingEvents}
            onEventSelection={handleEventSelection}
            onSelectAllEvents={handleSelectAllEvents}
          />

          {/* System Prompt Selection */}
          <SystemPromptSelection
            systemPrompts={systemPrompts}
            selectedSystemPromptId={selectedSystemPromptId}
            loadingSystemPrompts={loadingSystemPrompts}
            systemPromptError={systemPromptError}
            onSystemPromptChange={handleSystemPromptChange}
          />

          {/* Generation Controls - Now a separate component */}
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
            onUseMinimalCarDataChange={(checked) =>
              handleUseMinimalCarDataChange(checked, derivedLength)
            }
            showPreview={showPreview}
            onShowPreviewToggle={() => handleShowPreviewToggle(derivedLength)}
            editableLLMText={editableLLMText}
            onEditableLLMTextChange={setEditableLLMText}
            onRefreshLLMText={() => handleRefreshLLMText(derivedLength)}
            selectedSystemPromptId={selectedSystemPromptId}
            systemPrompts={systemPrompts}
            projectCars={projectCars}
            projectEvents={projectEvents}
            model={formState.model}
            temperature={formState.temperature}
            isGenerating={generationState.isGenerating}
            onGenerate={handleGenerate}
            error={generationState.error}
          />
        </div>

        {/* Right Column - Preview and Saved Captions */}
        <div className="flex flex-col h-full min-h-[600px]">
          <CaptionPreview
            generatedCaption={generationState.generatedCaption}
            platform={formState.platform}
            copiedId={savedCaptionsHook.copiedId}
            onCopyCaption={savedCaptionsHook.handleCopy}
            onSaveCaption={handleSaveCaption}
            viewMode={captionViewMode}
            onViewModeChange={setCaptionViewMode}
            savedCaptions={savedCaptionsHook.savedCaptions}
            editingCaptionId={savedCaptionsHook.editingCaptionId}
            editingText={savedCaptionsHook.editingText}
            onStartEdit={savedCaptionsHook.handleStartEdit}
            onCancelEdit={savedCaptionsHook.handleCancelEdit}
            onSaveEdit={handleSaveEdit}
            onEditTextChange={savedCaptionsHook.handleEditTextChange}
            onDeleteCaption={handleDeleteCaption}
            onUpdatePreviewCaption={handleUpdatePreviewCaption}
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
      />

      {promptHandlers.promptError && (
        <p className="mt-3 text-sm text-destructive-500 dark:text-destructive-400 text-center">
          {promptHandlers.promptError}
        </p>
      )}
    </div>
  );
}
