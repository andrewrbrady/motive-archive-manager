import { useCallback, useState } from "react";
import type { Tone, Style, Platform } from "../types";
import type { ProviderId } from "@/lib/llmProviders";

// Form state interface
export interface FormState {
  context: string;
  additionalContext: string;
  tone: Tone;
  style: Style;
  platform: Platform;
  model: string;
  provider: ProviderId;
  temperature: number;
}

// Form handlers interface
export interface FormHandlers {
  updateContext: (context: string) => void;
  updateAdditionalContext: (context: string) => void;
  updateTone: (tone: Tone) => void;
  updateStyle: (style: Style) => void;
  updatePlatform: (platform: Platform) => void;
  updateModel: (model: string) => void;
  updateProvider: (provider: ProviderId) => void;
  updateTemperature: (temperature: number) => void;
  updateFormValues: (values: Partial<FormState>) => void;
  resetForm: () => void;
}

// Default form values
export const DEFAULT_FORM_VALUES: FormState = {
  context: "",
  additionalContext: "",
  tone: "professional",
  style: "descriptive",
  platform: "instagram",
  model: "claude-3-5-sonnet-20241022",
  provider: "anthropic",
  temperature: 1.0,
};

// Hook for managing form state
export function useFormState(initialValues?: Partial<FormState>) {
  const [formState, setFormState] = useState<FormState>({
    ...DEFAULT_FORM_VALUES,
    ...initialValues,
  });

  const updateContext = useCallback((context: string) => {
    setFormState((prev) => ({ ...prev, context }));
  }, []);

  const updateAdditionalContext = useCallback((additionalContext: string) => {
    setFormState((prev) => ({ ...prev, additionalContext }));
  }, []);

  const updateTone = useCallback((tone: Tone) => {
    setFormState((prev) => ({ ...prev, tone }));
  }, []);

  const updateStyle = useCallback((style: Style) => {
    setFormState((prev) => ({ ...prev, style }));
  }, []);

  const updatePlatform = useCallback((platform: Platform) => {
    setFormState((prev) => ({ ...prev, platform }));
  }, []);

  const updateModel = useCallback((model: string) => {
    setFormState((prev) => ({ ...prev, model }));
  }, []);

  const updateProvider = useCallback((provider: ProviderId) => {
    setFormState((prev) => ({ ...prev, provider }));
  }, []);

  const updateTemperature = useCallback((temperature: number) => {
    setFormState((prev) => ({ ...prev, temperature }));
  }, []);

  const updateFormValues = useCallback((values: Partial<FormState>) => {
    setFormState((prev) => ({ ...prev, ...values }));
  }, []);

  const resetForm = useCallback(() => {
    setFormState(DEFAULT_FORM_VALUES);
  }, []);

  const handlers: FormHandlers = {
    updateContext,
    updateAdditionalContext,
    updateTone,
    updateStyle,
    updatePlatform,
    updateModel,
    updateProvider,
    updateTemperature,
    updateFormValues,
    resetForm,
  };

  return {
    formState,
    handlers,
    setFormState,
  };
}

// Hook for validation
export function useFormValidation() {
  const validateForm = useCallback(
    (formState: FormState, additionalChecks?: () => string | null) => {
      // Basic validation
      if (!formState.context.trim()) {
        return "Context is required";
      }

      if (!formState.tone) {
        return "Tone is required";
      }

      if (!formState.style) {
        return "Style is required";
      }

      if (!formState.platform) {
        return "Platform is required";
      }

      if (!formState.model) {
        return "Model is required";
      }

      if (!formState.provider) {
        return "Provider is required";
      }

      if (formState.temperature < 0 || formState.temperature > 2) {
        return "Temperature must be between 0 and 2";
      }

      // Additional custom validation
      if (additionalChecks) {
        const additionalError = additionalChecks();
        if (additionalError) {
          return additionalError;
        }
      }

      return null;
    },
    []
  );

  return { validateForm };
}

// Hook for form submission
export function useFormSubmission() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const submitForm = useCallback(
    async <T>(
      submitFn: () => Promise<T>,
      onSuccess?: (result: T) => void,
      onError?: (error: string) => void
    ): Promise<T | null> => {
      setIsSubmitting(true);
      setSubmitError(null);

      try {
        const result = await submitFn();
        onSuccess?.(result);
        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Submission failed";
        setSubmitError(errorMessage);
        onError?.(errorMessage);
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  return {
    isSubmitting,
    submitError,
    submitForm,
    setSubmitError,
  };
}
