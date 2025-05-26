import { useCallback, useState } from "react";
import { toast } from "@/components/ui/use-toast";
import type { PromptTemplate, Tone, Style, Platform } from "../types";

// Core prompt state interface
export interface PromptState {
  promptList: PromptTemplate[];
  selectedPrompt: PromptTemplate | null;
  promptLoading: boolean;
  promptError: string | null;
}

// Form values interface
export interface PromptFormValues {
  context: string;
  tone: Tone;
  style: Style;
  platform: Platform;
  model: string;
  provider: string;
  temperature: number;
}

// Modal state interface
export interface PromptModalState {
  isOpen: boolean;
  isCreating: boolean;
  isSubmitting: boolean;
}

// Callbacks interface for external state management
export interface PromptHandlerCallbacks {
  onPromptListUpdate?: (promptList: PromptTemplate[]) => void;
  onSelectedPromptUpdate?: (prompt: PromptTemplate | null) => void;
  onFormValuesUpdate?: (values: PromptFormValues) => void;
  onPromptError?: (error: string | null) => void;
  onPromptLoading?: (loading: boolean) => void;
}

// Main hook for prompt management
export function usePromptManager(
  initialState?: Partial<PromptState>,
  callbacks?: PromptHandlerCallbacks
) {
  // Internal state
  const [promptList, setPromptList] = useState<PromptTemplate[]>(
    initialState?.promptList || []
  );
  const [selectedPrompt, setSelectedPrompt] = useState<PromptTemplate | null>(
    initialState?.selectedPrompt || null
  );
  const [promptLoading, setPromptLoading] = useState(
    initialState?.promptLoading || false
  );
  const [promptError, setPromptError] = useState<string | null>(
    initialState?.promptError || null
  );

  // Update callbacks when state changes
  const updatePromptList = useCallback(
    (newList: PromptTemplate[]) => {
      setPromptList(newList);
      callbacks?.onPromptListUpdate?.(newList);
    },
    [callbacks]
  );

  const updateSelectedPrompt = useCallback(
    (prompt: PromptTemplate | null) => {
      setSelectedPrompt(prompt);
      callbacks?.onSelectedPromptUpdate?.(prompt);
    },
    [callbacks]
  );

  const updatePromptError = useCallback(
    (error: string | null) => {
      setPromptError(error);
      callbacks?.onPromptError?.(error);
    },
    [callbacks]
  );

  const updatePromptLoading = useCallback(
    (loading: boolean) => {
      setPromptLoading(loading);
      callbacks?.onPromptLoading?.(loading);
    },
    [callbacks]
  );

  // Fetch prompts
  const fetchPrompts = useCallback(async () => {
    updatePromptLoading(true);
    updatePromptError(null);

    try {
      const response = await fetch("/api/caption-prompts");
      if (!response.ok) {
        throw new Error("Failed to fetch prompt templates");
      }
      const prompts = await response.json();
      updatePromptList(prompts);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch prompts";
      updatePromptError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      updatePromptLoading(false);
    }
  }, [updatePromptList, updatePromptError, updatePromptLoading]);

  // Save prompt (create or update)
  const savePrompt = useCallback(
    async (
      promptData: any,
      isCreating: boolean
    ): Promise<PromptTemplate | null> => {
      try {
        const url = "/api/caption-prompts";
        const method = isCreating ? "POST" : "PATCH";

        // For updates, include the ID in the request body
        const payload = isCreating
          ? promptData
          : { ...promptData, id: selectedPrompt?._id };

        const response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error ||
              `Failed to ${isCreating ? "create" : "update"} prompt`
          );
        }

        const savedPrompt = await response.json();

        // Update local state
        if (isCreating) {
          updatePromptList([savedPrompt, ...promptList]);
        } else {
          updatePromptList(
            promptList.map((p) =>
              p._id === selectedPrompt?._id ? savedPrompt : p
            )
          );
        }

        updateSelectedPrompt(savedPrompt);

        toast({
          title: "Success",
          description: `Prompt ${isCreating ? "created" : "updated"} successfully`,
        });

        return savedPrompt;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : `Failed to ${isCreating ? "create" : "update"} prompt`;
        updatePromptError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        return null;
      }
    },
    [
      promptList,
      selectedPrompt,
      updatePromptList,
      updateSelectedPrompt,
      updatePromptError,
    ]
  );

  // Delete prompt
  const deletePrompt = useCallback(
    async (promptId: string): Promise<boolean> => {
      try {
        const response = await fetch("/api/caption-prompts", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id: promptId }),
        });

        if (!response.ok) {
          throw new Error("Failed to delete prompt");
        }

        updatePromptList(promptList.filter((p) => p._id !== promptId));

        if (selectedPrompt?._id === promptId) {
          updateSelectedPrompt(null);
        }

        toast({
          title: "Success",
          description: "Prompt deleted successfully",
        });

        return true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to delete prompt";
        updatePromptError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        return false;
      }
    },
    [
      promptList,
      selectedPrompt,
      updatePromptList,
      updateSelectedPrompt,
      updatePromptError,
    ]
  );

  // Select prompt and update form values
  const selectPrompt = useCallback(
    (prompt: PromptTemplate | null) => {
      updateSelectedPrompt(prompt);

      if (prompt && callbacks?.onFormValuesUpdate) {
        callbacks.onFormValuesUpdate({
          context: prompt.prompt || "",
          tone: prompt.tone as Tone,
          style: prompt.style as Style,
          platform: prompt.platform as Platform,
          model: prompt.aiModel || "claude-3-5-sonnet-20241022",
          provider: prompt.llmProvider || "anthropic",
          temperature: prompt.modelParams?.temperature || 1.0,
        });
      }
    },
    [updateSelectedPrompt, callbacks]
  );

  return {
    // State
    promptList,
    selectedPrompt,
    promptLoading,
    promptError,

    // Actions
    fetchPrompts,
    savePrompt,
    deletePrompt,
    selectPrompt,
    updatePromptList,
    updateSelectedPrompt,
    updatePromptError,
    updatePromptLoading,
  };
}

// Hook for modal management
export function usePromptModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openForCreate = useCallback(() => {
    setIsCreating(true);
    setIsOpen(true);
  }, []);

  const openForEdit = useCallback(() => {
    setIsCreating(false);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setIsSubmitting(false);
  }, []);

  const setSubmitting = useCallback((submitting: boolean) => {
    setIsSubmitting(submitting);
  }, []);

  return {
    isOpen,
    isCreating,
    isSubmitting,
    openForCreate,
    openForEdit,
    close,
    setSubmitting,
  };
}

// Combined hook for full prompt functionality
export function usePromptHandlers(
  initialState?: Partial<PromptState>,
  callbacks?: PromptHandlerCallbacks
) {
  const promptManager = usePromptManager(initialState, callbacks);
  const modal = usePromptModal();

  // Combined handlers
  const handleNewPrompt = useCallback(() => {
    promptManager.updateSelectedPrompt(null);
    modal.openForCreate();

    // Reset form to defaults
    if (callbacks?.onFormValuesUpdate) {
      callbacks.onFormValuesUpdate({
        context: "",
        tone: "professional",
        style: "descriptive",
        platform: "instagram",
        model: "claude-3-5-sonnet-20241022",
        provider: "anthropic",
        temperature: 1.0,
      });
    }
  }, [promptManager, modal, callbacks]);

  const handleEditPrompt = useCallback(() => {
    if (promptManager.selectedPrompt) {
      modal.openForEdit();
    }
  }, [promptManager.selectedPrompt, modal]);

  const handlePromptSaved = useCallback(
    async (promptData: any): Promise<boolean> => {
      modal.setSubmitting(true);

      const savedPrompt = await promptManager.savePrompt(
        promptData,
        modal.isCreating
      );

      modal.setSubmitting(false);

      if (savedPrompt) {
        modal.close();
        return true;
      }

      return false;
    },
    [promptManager, modal]
  );

  const handlePromptChange = useCallback(
    (promptId: string) => {
      const prompt =
        promptManager.promptList.find((p) => p._id === promptId) || null;
      promptManager.selectPrompt(prompt);
    },
    [promptManager]
  );

  return {
    // State from both hooks
    ...promptManager,
    ...modal,

    // Combined handlers
    handleNewPrompt,
    handleEditPrompt,
    handlePromptSaved,
    handlePromptChange,
  };
}
