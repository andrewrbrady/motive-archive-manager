"use client";

import React, { Suspense, lazy } from "react";
import { LoadingContainer } from "@/components/ui/loading";
import { useCaptionData } from "./hooks/useCaptionData";
import { useFormState } from "./hooks/useFormState";
import { useGenerationHandlers } from "./hooks/useGenerationHandlers";
import type { CaptionGeneratorProps, GenerationContext } from "./types";

// Lazy load heavy components for better performance
const CaptionPreview = lazy(() =>
  import("./CaptionPreview").then((m) => ({ default: m.CaptionPreview }))
);
const PromptEditModal = lazy(() =>
  import("./PromptEditModal").then((m) => ({ default: m.PromptEditModal }))
);

// Import lightweight components normally
import { CarSelection } from "./CarSelection";
import { EventSelection } from "./EventSelection";
import { SystemPromptSelection } from "./SystemPromptSelection";
import { GenerationControls } from "./GenerationControls";

// Loading component for suspense fallbacks
function ComponentLoader() {
  return (
    <div className="flex items-center justify-center py-8">
      <LoadingContainer />
    </div>
  );
}

export function CaptionGenerator({
  carId,
  projectId,
  mode = "car",
}: CaptionGeneratorProps) {
  // Data management hook
  const captionData = useCaptionData({ carId, projectId, mode });

  // Form state management
  const { formState, handlers: formHandlers } = useFormState();

  // Generation handlers
  const { generationState, generateCaption, updateGeneratedCaption } =
    useGenerationHandlers();

  // Guard against missing required props
  if (mode === "car" && !carId) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Car ID is required for car mode.</p>
      </div>
    );
  }

  if (mode === "project" && !projectId) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Project ID is required for project mode.</p>
      </div>
    );
  }

  // Derive length from selected prompt template
  const derivedLength =
    captionData.lengthSettings.find(
      (l) => l.key === formState.platform // This would be updated based on selected prompt
    ) || null;

  const handleGenerateContent = async () => {
    const context: GenerationContext = {
      carId,
      selectedCarIds: captionData.selectedCarIds,
      selectedEventIds: captionData.selectedEventIds,
      selectedSystemPromptId: captionData.selectedSystemPromptId,
      carDetails:
        mode === "car" && captionData.carDetails
          ? [captionData.carDetails]
          : captionData.projectCars,
      eventDetails: captionData.eventDetails,
      derivedLength,
      useMinimalCarData: captionData.useMinimalCarData,
      editableLLMText: captionData.editableLLMText,
      clientHandle: captionData.clientHandle,
    };

    await generateCaption(context, formState);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Caption Generator</h2>
        <p className="text-muted-foreground">
          Generate AI-powered captions for your{" "}
          {mode === "car" ? "car" : "project"}
        </p>
      </div>

      <div className="flex flex-1 gap-6">
        {/* Left Panel - Configuration */}
        <div className="w-1/3 space-y-6">
          {/* Car Selection */}
          {mode === "project" && (
            <CarSelection
              cars={captionData.projectCars}
              selectedCarIds={captionData.selectedCarIds}
              onCarSelection={captionData.handleCarSelection}
              onSelectAll={captionData.handleSelectAllCars}
              loading={captionData.loadingCars}
            />
          )}

          {/* Event Selection */}
          {mode === "project" && (
            <EventSelection
              events={captionData.projectEvents}
              selectedEventIds={captionData.selectedEventIds}
              onEventSelection={captionData.handleEventSelection}
              onSelectAll={captionData.handleSelectAllEvents}
              loading={captionData.loadingEvents}
            />
          )}

          {/* System Prompt Selection */}
          <SystemPromptSelection
            systemPrompts={captionData.systemPrompts}
            selectedSystemPromptId={captionData.selectedSystemPromptId}
            onSystemPromptChange={captionData.handleSystemPromptChange}
            loading={captionData.loadingSystemPrompts}
            error={captionData.systemPromptError}
          />

          {/* Generation Controls */}
          <GenerationControls
            formState={formState}
            formHandlers={formHandlers}
            promptTemplates={captionData.promptTemplates}
            lengthSettings={captionData.lengthSettings}
            onGenerate={handleGenerateContent}
            isGenerating={generationState.isGenerating}
            useMinimalCarData={captionData.useMinimalCarData}
            onUseMinimalCarDataChange={
              captionData.handleUseMinimalCarDataChange
            }
            showPreview={captionData.showPreview}
            onShowPreviewToggle={captionData.handleShowPreviewToggle}
            editableLLMText={captionData.editableLLMText}
            onEditableLLMTextChange={captionData.setEditableLLMText}
            onRefreshLLMText={captionData.handleRefreshLLMText}
          />
        </div>

        {/* Right Panel - Preview and Results */}
        <div className="flex-1">
          <Suspense fallback={<ComponentLoader />}>
            <CaptionPreview
              generatedCaption={generationState.generatedCaption}
              savedCaptions={captionData.savedCaptions}
              onUpdateCaption={updateGeneratedCaption}
              onSaveCaption={async (caption: string) => {
                // Implementation for saving caption
                const params = new URLSearchParams();
                if (carId && mode === "car") params.append("carId", carId);
                if (projectId && mode === "project")
                  params.append("projectId", projectId);

                const response = await fetch("/api/captions", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    caption,
                    platform: formState.platform,
                    context: formState.context,
                    carId: mode === "car" ? carId : undefined,
                    projectId: mode === "project" ? projectId : undefined,
                    carIds: captionData.selectedCarIds,
                    eventIds: captionData.selectedEventIds,
                  }),
                });

                if (response.ok) {
                  await captionData.refetchCaptions();
                  return true;
                }
                return false;
              }}
              loading={captionData.loadingSavedCaptions}
              error={generationState.error}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
