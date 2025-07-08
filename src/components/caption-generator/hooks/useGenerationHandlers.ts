import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { CaptionFormState, GenerationContext } from "../types";
import { useAPI } from "@/hooks/useAPI";

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
  const api = useAPI();

  const generateCaption = useCallback(
    async (context: GenerationContext, formState: CaptionFormState) => {
      if (!api) {
        toast.error("Authentication required to generate captions");
        return;
      }

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

        const data = await api.post<{ caption: string }>(
          "/captions/generate",
          requestBody
        );

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
    [api]
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
