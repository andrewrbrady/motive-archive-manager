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
  selectedEventIds: string[];
  selectedSystemPromptId: string;
  carDetails: BaTCarDetails[];
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
    (updates: Partial<GenerationState>) => {
      setGenerationState((prev) => ({ ...prev, ...updates }));
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
        updateGenerationState({
          error: "API not available",
          isGenerating: false,
        });
        return null;
      }

      // Validate inputs
      const validationError = validateGeneration(context, formState);
      if (validationError) {
        updateGenerationState({
          error: validationError,
          isGenerating: false,
        });
        return null;
      }

      // Prepare car details for the API
      const combinedCarDetails = {
        count: context.selectedCarIds.length,
        cars: context.carDetails,
        makes: [...new Set(context.carDetails.map((car) => car.make))],
        years: [...new Set(context.carDetails.map((car) => car.year))].sort(),
        colors: [
          ...new Set(
            context.carDetails.map((car) => car.color).filter((color) => color)
          ),
        ],
      };

      // Prepare event details for the API
      const combinedEventDetails = {
        count: context.selectedEventIds.length,
        events: context.eventDetails,
        types: [...new Set(context.eventDetails.map((event) => event.type))],
        upcomingEvents: context.eventDetails.filter(
          (event) => new Date(event.start) > new Date()
        ),
        pastEvents: context.eventDetails.filter(
          (event) => new Date(event.start) <= new Date()
        ),
      };

      // Determine context to use
      let contextToUse = formState.context;

      // Client info handling
      const clientInfo = context.clientHandle
        ? {
            handle: context.clientHandle,
            includeInCaption: true,
          }
        : null;

      // Prepare the request payload
      const requestPayload: any = {
        platform: formState.platform,
        context: contextToUse,
        clientInfo,
        carDetails: combinedCarDetails,
        eventDetails: combinedEventDetails,
        temperature: formState.temperature,
        tone: formState.tone,
        style: formState.style,
        length: context.derivedLength?.key || "standard",
        template: formState.context, // This might need adjustment based on your API
        aiModel: formState.model,
        projectId: context.projectId,
        selectedCarIds: context.selectedCarIds,
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

      // Phase 3C FIX: Remove blocking await from background generation
      setTimeout(() => {
        generateOperation().catch((error) => {
          console.error("Error in generation operation:", error);
        });
      }, 0);

      // Return immediately - don't block UI
      return null;
    },
    [api, validateGeneration, updateGenerationState]
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

      // Phase 3C FIX: Convert blocking await to non-blocking pattern
      toast({
        title: "Updating...",
        description: "Caption is being updated in background",
      });

      // Provide immediate feedback
      setEditingCaptionId(null);
      setEditingText("");

      // Execute update operation in background - truly non-blocking
      const updateOperation = () => {
        api
          .patch(`projects/${projectId}/captions?id=${captionId}`, {
            caption: editingText,
          })
          .then(() => {
            // Update local state
            setSavedCaptions((prev) =>
              prev.map((caption) =>
                caption._id === captionId
                  ? { ...caption, caption: editingText }
                  : caption
              )
            );

            toast({
              title: "Success",
              description: "Caption updated successfully",
            });
          })
          .catch((error) => {
            console.error("Error updating caption:", error);
            toast({
              title: "Error",
              description: "Failed to update caption",
              variant: "destructive",
            });
          });
      };

      // Start background operation
      setTimeout(updateOperation, 0);

      // Return immediately with optimistic success
      return true;
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
