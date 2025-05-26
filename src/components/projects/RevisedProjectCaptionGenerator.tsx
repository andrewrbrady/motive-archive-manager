"use client";

import React, { useState } from "react";
import { toast } from "@/components/ui/use-toast";
import { CarSelection } from "./caption-generator/CarSelection";
import { EventSelection } from "./caption-generator/EventSelection";
import { SystemPromptSelection } from "./caption-generator/SystemPromptSelection";
import { CaptionPreview } from "./caption-generator/CaptionPreview";
import { GenerationControls } from "./caption-generator/GenerationControls";
import { PromptEditModal } from "./caption-generator/PromptEditModal";
import { useProjectData } from "./caption-generator/useProjectData";
import type { Project } from "@/types/project";
import type {
  PromptTemplate,
  Tone,
  Style,
  Platform,
} from "./caption-generator/types";

interface RevisedProjectCaptionGeneratorProps {
  project: Project;
  onProjectUpdate: () => void;
}

export function RevisedProjectCaptionGenerator({
  project,
  onProjectUpdate,
}: RevisedProjectCaptionGeneratorProps) {
  // Prompt modal state
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [isCreatingPrompt, setIsCreatingPrompt] = useState(false);
  const [clientHandle, setClientHandle] = useState<string | null>(null);

  // Use project data hook - must be called before any early returns
  const projectDataHook = useProjectData({ projectId: project._id || "" });

  // Guard against missing project ID
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
    derivedLength,

    // Prompt templates
    promptList,
    selectedPrompt,
    promptLoading,
    promptError,
    handlePromptChange,
    setPromptList,
    setSelectedPrompt,
    setPromptError,

    // Generation settings
    platform,
    setPlatform,
    template,
    setTemplate,
    context,
    setContext,
    additionalContext,
    setAdditionalContext,
    tone,
    setTone,
    style,
    setStyle,
    model,
    setModel,
    provider,
    setProvider,
    temperature,
    setTemperature,

    // Generation state
    isGenerating,
    setIsGenerating,
    generatedCaption,
    setGeneratedCaption,
    error,
    setError,

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

    // Saved captions
    savedCaptions,
    setSavedCaptions,
    copiedId,
    setCopiedId,
    editingCaptionId,
    setEditingCaptionId,
    editingText,
    setEditingText,

    // Refetch functions
    refetchCars,
    refetchEvents,
    refetchSystemPrompts,
    refetchPromptTemplates,
    refetchCaptions,
  } = projectDataHook;

  const handleGenerate = async () => {
    if (
      !selectedSystemPromptId ||
      selectedCarIds.length === 0 ||
      !selectedPrompt
    ) {
      setError(
        "Please select a system prompt, at least one car, and a prompt template."
      );
      return;
    }

    if (!derivedLength) {
      setError(
        "Selected prompt template does not have a valid length setting."
      );
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);

      // Combine context with additional context
      let contextToUse = context;
      if (additionalContext.trim()) {
        contextToUse = contextToUse
          ? `${contextToUse}\n\nAdditional Context:\n${additionalContext}`
          : additionalContext;
      }

      const clientInfo =
        clientHandle && clientHandle
          ? {
              handle: clientHandle,
              includeInCaption: true,
            }
          : null;

      // Combine car details for multi-car captions
      const combinedCarDetails = {
        cars: carDetails,
        count: carDetails.length,
        makes: [...new Set(carDetails.map((car) => car.make))],
        years: [...new Set(carDetails.map((car) => car.year))].sort(),
        colors: [
          ...new Set(carDetails.map((car) => car.color).filter(Boolean)),
        ],
      };

      // Combine event details for multi-event captions
      const combinedEventDetails = {
        events: eventDetails,
        count: eventDetails.length,
        types: [...new Set(eventDetails.map((event) => event.type))],
        statuses: [...new Set(eventDetails.map((event) => event.status))],
        upcomingEvents: eventDetails.filter(
          (event) => new Date(event.start) > new Date()
        ),
        pastEvents: eventDetails.filter(
          (event) => new Date(event.start) <= new Date()
        ),
      };

      // Prepare the request payload
      const requestPayload: any = {
        platform,
        context: contextToUse,
        clientInfo,
        carDetails: combinedCarDetails,
        eventDetails: combinedEventDetails,
        temperature,
        tone,
        style,
        length: derivedLength.key,
        template,
        aiModel: model,
        projectId: project._id,
        selectedCarIds,
        selectedEventIds,
        systemPromptId: selectedSystemPromptId,
        useMinimalCarData,
      };

      // If we have custom edited LLM text, include it in the request
      if (editableLLMText && editableLLMText.trim()) {
        requestPayload.customLLMText = editableLLMText;
      }

      // Generate new caption text - FIXED: Use correct API endpoint
      const response = await fetch("/api/openai/generate-project-caption", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate caption");
      }

      const data = await response.json();
      setGeneratedCaption(data.caption);

      toast({
        title: "Success",
        description:
          editableLLMText && editableLLMText.trim()
            ? "Caption generated using your custom LLM input"
            : "Caption generated successfully",
      });
    } catch (error) {
      console.error("Error generating caption:", error);
      setError(
        error instanceof Error ? error.message : "Failed to generate caption"
      );
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to generate caption",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveCaption = async () => {
    if (!generatedCaption) return;

    try {
      const response = await fetch(`/api/projects/${project._id}/captions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          caption: generatedCaption,
          platform,
          context: context || "",
          carIds: selectedCarIds,
          eventIds: selectedEventIds,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save caption");
      }

      toast({
        title: "Success",
        description: "Caption saved successfully",
      });

      // Refresh saved captions
      refetchCaptions();
      setGeneratedCaption("");
    } catch (error) {
      console.error("Error saving caption:", error);
      toast({
        title: "Error",
        description: "Failed to save caption",
        variant: "destructive",
      });
    }
  };

  const handleCopy = async (text: string, id: string) => {
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
  };

  const handleStartEdit = (captionId: string, currentText: string) => {
    setEditingCaptionId(captionId);
    setEditingText(currentText);
  };

  const handleCancelEdit = () => {
    setEditingCaptionId(null);
    setEditingText("");
  };

  const handleSaveEdit = async (captionId: string) => {
    try {
      const response = await fetch(
        `/api/projects/${project._id}/captions/${captionId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            caption: editingText,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update caption");
      }

      // Update local state
      setSavedCaptions((prev) =>
        prev.map((caption) =>
          caption._id === captionId
            ? { ...caption, caption: editingText }
            : caption
        )
      );

      setEditingCaptionId(null);
      setEditingText("");

      toast({
        title: "Success",
        description: "Caption updated successfully",
      });
    } catch (error) {
      console.error("Error updating caption:", error);
      toast({
        title: "Error",
        description: "Failed to update caption",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCaption = async (captionId: string) => {
    try {
      const response = await fetch(
        `/api/projects/${project._id}/captions/${captionId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete caption");
      }

      // Update local state
      setSavedCaptions((prev) =>
        prev.filter((caption) => caption._id !== captionId)
      );

      toast({
        title: "Success",
        description: "Caption deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting caption:", error);
      toast({
        title: "Error",
        description: "Failed to delete caption",
        variant: "destructive",
      });
    }
  };

  const handleEditTextChange = (text: string) => {
    setEditingText(text);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            promptList={promptList}
            selectedPrompt={selectedPrompt}
            promptLoading={promptLoading}
            promptError={promptError}
            onPromptChange={handlePromptChange}
            onEditPrompt={() => {
              if (selectedPrompt) {
                setIsCreatingPrompt(false);
                setIsPromptModalOpen(true);
              }
            }}
            onNewPrompt={() => {
              setSelectedPrompt(null);
              setIsCreatingPrompt(true);
              setContext("");
              setTone("professional");
              setStyle("descriptive");
              setModel("claude-3-5-sonnet-20241022");
              setProvider("anthropic");
              setTemperature(1.0);
              setIsPromptModalOpen(true);
            }}
            additionalContext={additionalContext}
            onAdditionalContextChange={setAdditionalContext}
            context={context}
            platform={platform}
            tone={tone}
            style={style}
            derivedLength={derivedLength}
            selectedEventIds={selectedEventIds}
            useMinimalCarData={useMinimalCarData}
            onUseMinimalCarDataChange={handleUseMinimalCarDataChange}
            showPreview={showPreview}
            onShowPreviewToggle={handleShowPreviewToggle}
            editableLLMText={editableLLMText}
            onEditableLLMTextChange={setEditableLLMText}
            onRefreshLLMText={handleRefreshLLMText}
            selectedSystemPromptId={selectedSystemPromptId}
            systemPrompts={systemPrompts}
            projectCars={projectCars}
            projectEvents={projectEvents}
            model={model}
            temperature={temperature}
            isGenerating={isGenerating}
            onGenerate={handleGenerate}
            error={error}
          />
        </div>

        {/* Right Column - Preview and Saved Captions */}
        <div className="space-y-4">
          <CaptionPreview
            generatedCaption={generatedCaption}
            platform={platform}
            copiedId={copiedId}
            onCopyCaption={handleCopy}
            onSaveCaption={handleSaveCaption}
            savedCaptions={savedCaptions}
            editingCaptionId={editingCaptionId}
            editingText={editingText}
            onStartEdit={handleStartEdit}
            onCancelEdit={handleCancelEdit}
            onSaveEdit={handleSaveEdit}
            onEditTextChange={handleEditTextChange}
            onDeleteCaption={handleDeleteCaption}
          />
        </div>
      </div>

      {/* Modal for Editing or Creating Prompts */}
      <PromptEditModal
        isOpen={isPromptModalOpen}
        onClose={() => setIsPromptModalOpen(false)}
        isCreating={isCreatingPrompt}
        selectedPrompt={selectedPrompt}
        model={model}
        provider={provider}
        temperature={temperature}
        clientHandle={clientHandle}
        onPromptSaved={(prompt: PromptTemplate) => {
          // Update local prompt list and selected prompt
          if (isCreatingPrompt) {
            setPromptList((prev) => [prompt, ...prev]);
            setSelectedPrompt(prompt);
          } else {
            setPromptList((prev) =>
              prev.map((p) => (p._id === selectedPrompt!._id ? prompt : p))
            );
            setSelectedPrompt(prompt);
          }
        }}
        onModelChange={setModel}
        onProviderChange={setProvider}
        onTemperatureChange={setTemperature}
        onFormValuesUpdate={(values) => {
          setContext(values.context);
          setTone(values.tone as Tone);
          setStyle(values.style as Style);
          setPlatform(values.platform as Platform);
          setModel(values.model);
          setProvider(values.provider);
          setTemperature(values.temperature);
        }}
      />

      {promptError && (
        <p className="mt-3 text-sm text-destructive-500 dark:text-destructive-400 text-center">
          {promptError}
        </p>
      )}
    </div>
  );
}
