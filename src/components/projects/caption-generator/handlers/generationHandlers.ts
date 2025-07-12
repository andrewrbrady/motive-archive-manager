import { useCallback, useState } from "react";
import { toast } from "@/components/ui/use-toast";
import { useAPI } from "@/hooks/useAPI";
import type { FormState } from "./formHandlers";
import type { ProjectEvent, LengthSetting } from "../types";
import type { BaTCarDetails } from "@/types/car-page";

// Generation state interface
export interface GenerationState {
  isGenerating: boolean;
  generatedCaption: string;
  error: string | null;
}

// Generation context interface
export interface GenerationContext {
  projectId: string;
  selectedCarIds: string[];
  selectedModelIds: string[];
  selectedEventIds: string[];
  selectedSystemPromptId: string;
  carDetails: BaTCarDetails[];
  modelDetails: any[];
  eventDetails: ProjectEvent[];
  derivedLength: LengthSetting | null;
  useMinimalCarData: boolean;
  editableLLMText?: string;
  clientHandle?: string | null;
}

// Generation handlers
export function useGenerationHandlers() {
  const api = useAPI();
  const [generationState, setGenerationState] = useState<GenerationState>({
    isGenerating: false,
    generatedCaption: "",
    error: null,
  });

  const updateGenerationState = useCallback(
    (update: Partial<GenerationState>) => {
      setGenerationState((prev) => ({ ...prev, ...update }));
    },
    []
  );

  const validateGeneration = useCallback(
    (context: GenerationContext, formState: FormState): string | null => {
      if (!context.selectedSystemPromptId) {
        return "Please select a system prompt";
      }

      if (context.selectedCarIds.length === 0) {
        return "Please select at least one car";
      }

      if (!context.derivedLength) {
        console.warn(
          "🚨 Car Copywriter: Selected prompt template does not have a valid length setting. Using fallback default."
        );
      }

      if (!formState.context.trim()) {
        return "Context is required";
      }

      return null;
    },
    []
  );

  const generateCaption = useCallback(
    async (
      context: GenerationContext,
      formState: FormState
    ): Promise<string | null> => {
      if (!api) {
        toast({
          title: "Error",
          description: "Authentication required to generate captions",
          variant: "destructive",
        });
        return null;
      }

      // Prepare context for reuse
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

      // Process car details appropriately
      let combinedCarDetails;
      if (Array.isArray(context.carDetails) && context.carDetails.length > 0) {
        combinedCarDetails = {
          cars: context.carDetails,
          count: context.carDetails.length,
          useMinimal: context.useMinimalCarData,
        };
      } else {
        // Handle case where carDetails might not be an array or might be empty
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

      // Process event details
      let combinedEventDetails = null;
      if (
        Array.isArray(context.eventDetails) &&
        context.eventDetails.length > 0
      ) {
        combinedEventDetails = {
          events: context.eventDetails,
          count: context.eventDetails.length,
          types: [...new Set(context.eventDetails.map((event) => event.type))],
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
          makes: [...new Set(context.modelDetails.map((model) => model.make))],
          segments: [
            ...new Set(
              context.modelDetails
                .map((model) => model.market_segment)
                .filter(Boolean)
            ),
          ],
        };
      }

      // Prepare the request payload
      const requestPayload: any = {
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
        template: formState.context, // This might need adjustment based on your API
        aiModel: formState.model,
        projectId: context.projectId,
        selectedCarIds: context.selectedCarIds,
        selectedModelIds: context.selectedModelIds,
        selectedEventIds: context.selectedEventIds,
        systemPromptId: context.selectedSystemPromptId,
        useMinimalCarData: context.useMinimalCarData,
      };

      // If we have custom edited LLM text, include it in the request
      if (context.editableLLMText && context.editableLLMText.trim()) {
        requestPayload.customLLMText = context.editableLLMText;
      }

      // Phase 3B optimization: Convert blocking await to non-blocking for UI responsiveness
      updateGenerationState({
        isGenerating: true,
        error: null,
        generatedCaption: "",
      });

      // Provide immediate feedback that generation started
      toast({
        title: "Starting generation...",
        description: "Caption generation is starting in background",
      });

      // Execute generation in background
      const generateOperation = async () => {
        try {
          // Generate new caption text
          const data = (await api.post(
            "openai/generate-project-caption",
            requestPayload
          )) as any;
          const caption = data.caption;

          updateGenerationState({
            generatedCaption: caption,
            isGenerating: false,
          });

          toast({
            title: "Success",
            description:
              context.editableLLMText && context.editableLLMText.trim()
                ? "Caption generated using your custom LLM input"
                : `Caption generated successfully${data.processingTime ? ` in ${(data.processingTime / 1000).toFixed(1)}s` : ""}`,
          });

          return caption;
        } catch (error: any) {
          console.error("Error generating caption:", error);

          let errorMessage = "Failed to generate caption";

          // Handle different types of errors
          if (error instanceof Error) {
            if (
              error.message.includes("timeout") ||
              error.message.includes("Timeout")
            ) {
              errorMessage =
                "The caption generation timed out. This can happen with complex prompts or when the AI service is busy. Please try again.";
            } else if (error.message.includes("Failed to fetch")) {
              errorMessage =
                "Network error - please check your connection and try again.";
            } else {
              errorMessage = error.message;
            }
          }

          updateGenerationState({
            error: errorMessage,
            isGenerating: false,
            generatedCaption: "",
          });

          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          });

          return null;
        }
      };

      // Execute operation in background
      setTimeout(generateOperation, 0);

      return null; // Immediate return since we're async
    },
    [api, updateGenerationState]
  );

  // New streaming generation function
  const generateCaptionStream = useCallback(
    async (context: GenerationContext, formState: FormState): Promise<void> => {
      if (!api) {
        toast({
          title: "Error",
          description: "Authentication required to generate captions",
          variant: "destructive",
        });
        return;
      }

      // Prepare the same request payload as the regular generation
      const contextToUse = formState.additionalContext
        ? `${formState.context}\n\nAdditional context: ${formState.additionalContext}`
        : formState.context;

      const requestPayload = {
        platform: formState.platform,
        context: contextToUse,
        temperature: formState.temperature,
        tone: formState.tone,
        style: formState.style,
        length: context.derivedLength?.key || "standard",
        aiModel: formState.model,
        projectId: context.projectId,
        selectedCarIds: context.selectedCarIds,
        selectedEventIds: context.selectedEventIds,
        systemPromptId: context.selectedSystemPromptId,
        useMinimalCarData: context.useMinimalCarData,
        customLLMText: context.editableLLMText,
      };

      updateGenerationState({
        isGenerating: true,
        error: null,
        generatedCaption: "",
      });

      try {
        // Make streaming request
        const response = await fetch(
          "/api/openai/generate-project-caption-stream",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestPayload),
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

        toast({
          title: "Streaming...",
          description: "Caption is being generated in real-time",
        });

        // Read the stream
        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulator += chunk;

          // Update the caption in real-time
          updateGenerationState({
            generatedCaption: accumulator,
            isGenerating: true, // Still generating
          });
        }

        // Mark as complete
        updateGenerationState({
          isGenerating: false,
        });

        toast({
          title: "Success",
          description: "Caption generated successfully with streaming",
        });
      } catch (error: any) {
        console.error("Error in streaming generation:", error);

        updateGenerationState({
          error: error.message || "Failed to generate streaming caption",
          isGenerating: false,
          generatedCaption: "",
        });

        toast({
          title: "Error",
          description: "Failed to generate streaming caption",
          variant: "destructive",
        });
      }
    },
    [api, updateGenerationState]
  );

  const clearGeneration = useCallback(() => {
    updateGenerationState({
      generatedCaption: "",
      error: null,
    });
  }, [updateGenerationState]);

  const setError = useCallback(
    (error: string | null) => {
      updateGenerationState({ error });
    },
    [updateGenerationState]
  );

  const updateGeneratedCaption = useCallback(
    (caption: string) => {
      updateGenerationState({ generatedCaption: caption });
    },
    [updateGenerationState]
  );

  return {
    generationState,
    generateCaption,
    clearGeneration,
    setError,
    validateGeneration,
    updateGeneratedCaption,
    generateCaptionStream,
  };
}

// Hook for saving captions
export function useCaptionSaver() {
  const api = useAPI();
  const [isSaving, setIsSaving] = useState(false);

  const saveCaption = useCallback(
    async (
      projectId: string,
      caption: string,
      platform: string,
      context?: string,
      carIds: string[] = [],
      eventIds: string[] = []
    ): Promise<boolean> => {
      if (!caption || !api) return false;

      setIsSaving(true);

      // Phase 3C FIX: Convert blocking await to non-blocking pattern
      toast({
        title: "Saving...",
        description: "Caption is being saved in background",
      });

      // Execute save operation in background - truly non-blocking
      const saveOperation = () => {
        api
          .post(`projects/${projectId}/captions`, {
            caption,
            platform,
            context: context || "",
            carIds,
            eventIds,
          })
          .then(() => {
            toast({
              title: "Success",
              description: "Caption saved successfully",
            });
          })
          .catch((error) => {
            console.error("Error saving caption:", error);
            toast({
              title: "Error",
              description: "Failed to save caption",
              variant: "destructive",
            });
          })
          .finally(() => {
            setIsSaving(false);
          });
      };

      // Start background operation
      setTimeout(saveOperation, 0);

      // Return immediately with optimistic success
      return true;
    },
    [api]
  );

  return {
    isSaving,
    saveCaption,
  };
}

// Hook for managing saved captions
export function useSavedCaptions() {
  const api = useAPI();
  const [savedCaptions, setSavedCaptions] = useState<any[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingCaptionId, setEditingCaptionId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

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

  const handleSaveEdit = useCallback(
    async (projectId: string, captionId: string) => {
      if (!api) return false;

      try {
        // Keep edit mode open while saving
        toast({
          title: "Saving...",
          description: "Updating caption...",
        });

        // Make the API call and wait for it to complete
        await api.patch(`projects/${projectId}/captions?id=${captionId}`, {
          caption: editingText,
        });

        // Update local state
        setSavedCaptions((prev) =>
          prev.map((caption) =>
            caption._id === captionId
              ? { ...caption, caption: editingText }
              : caption
          )
        );

        // Only close edit mode after successful save
        setEditingCaptionId(null);
        setEditingText("");

        toast({
          title: "Success",
          description: "Caption updated successfully",
        });

        return true;
      } catch (error) {
        console.error("Error updating caption:", error);
        toast({
          title: "Error",
          description: "Failed to update caption",
          variant: "destructive",
        });

        // Keep edit mode open on error so user can try again
        return false;
      }
    },
    [api, editingText]
  );

  const handleDeleteCaption = useCallback(
    async (projectId: string, captionId: string) => {
      if (!api) return false;

      // Phase 3C FIX: Convert blocking await to non-blocking pattern
      toast({
        title: "Deleting...",
        description: "Caption is being deleted in background",
      });

      // Execute delete operation in background - truly non-blocking
      const deleteOperation = () => {
        api
          .delete(`projects/${projectId}/captions?id=${captionId}`)
          .then(() => {
            // Update local state
            setSavedCaptions((prev) =>
              prev.filter((caption) => caption._id !== captionId)
            );

            toast({
              title: "Success",
              description: "Caption deleted successfully",
            });
          })
          .catch((error) => {
            console.error("Error deleting caption:", error);
            toast({
              title: "Error",
              description: "Failed to delete caption",
              variant: "destructive",
            });
          });
      };

      // Start background operation
      setTimeout(deleteOperation, 0);

      // Return immediately with optimistic success
      return true;
    },
    [api]
  );

  const handleEditTextChange = useCallback((text: string) => {
    setEditingText(text);
  }, []);

  return {
    savedCaptions,
    setSavedCaptions,
    copiedId,
    editingCaptionId,
    editingText,
    handleCopy,
    handleStartEdit,
    handleCancelEdit,
    handleSaveEdit,
    handleDeleteCaption,
    handleEditTextChange,
  };
}
