import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { CaptionFormState, GenerationContext } from "../types";

interface GenerationState {
  isGenerating: boolean;
  generatedCaption: string | null;
  error: string | null;
}

const initialGenerationState: GenerationState = {
  isGenerating: false,
  generatedCaption: null,
  error: null,
};

export function useGenerationHandlers() {
  const [generationState, setGenerationState] = useState<GenerationState>(
    initialGenerationState
  );

  const generateCaption = useCallback(
    async (context: GenerationContext, formState: CaptionFormState) => {
      setGenerationState((prev) => ({
        ...prev,
        isGenerating: true,
        error: null,
      }));

      try {
        const requestBody = {
          // Context data
          carId: context.carId,
          selectedCarIds: context.selectedCarIds,
          selectedEventIds: context.selectedEventIds,
          selectedSystemPromptId: context.selectedSystemPromptId,
          carDetails: context.carDetails,
          eventDetails: context.eventDetails,
          derivedLength: context.derivedLength,
          useMinimalCarData: context.useMinimalCarData,
          editableLLMText: context.editableLLMText,
          clientHandle: context.clientHandle,

          // Form data
          context: formState.context,
          additionalContext: formState.additionalContext,
          tone: formState.tone,
          style: formState.style,
          platform: formState.platform,
          model: formState.model,
          provider: formState.provider,
          temperature: formState.temperature,
        };

        const response = await fetch("/api/captions/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to generate caption");
        }

        const data = await response.json();

        setGenerationState((prev) => ({
          ...prev,
          isGenerating: false,
          generatedCaption: data.caption,
        }));

        toast.success("Caption generated successfully!");
      } catch (error) {
        console.error("Error generating caption:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to generate caption";

        setGenerationState((prev) => ({
          ...prev,
          isGenerating: false,
          error: errorMessage,
        }));

        toast.error(errorMessage);
      }
    },
    []
  );

  const updateGeneratedCaption = useCallback((caption: string) => {
    setGenerationState((prev) => ({
      ...prev,
      generatedCaption: caption,
    }));
  }, []);

  const clearGeneration = useCallback(() => {
    setGenerationState(initialGenerationState);
  }, []);

  const retryGeneration = useCallback(
    async (context: GenerationContext, formState: CaptionFormState) => {
      await generateCaption(context, formState);
    },
    [generateCaption]
  );

  return {
    generationState,
    generateCaption,
    updateGeneratedCaption,
    clearGeneration,
    retryGeneration,
  };
}
