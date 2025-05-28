import { useState, useCallback } from "react";
import type { CaptionFormState, Platform, Tone, Style } from "../types";
import type { ProviderId } from "@/lib/llmProviders";

const initialFormState: CaptionFormState = {
  context: "",
  additionalContext: "",
  tone: "professional",
  style: "descriptive",
  platform: "instagram",
  model: "",
  provider: "openai",
  temperature: 0.7,
};

export function useFormState() {
  const [formState, setFormState] =
    useState<CaptionFormState>(initialFormState);

  const updateFormValues = useCallback((updates: Partial<CaptionFormState>) => {
    setFormState((prev) => ({ ...prev, ...updates }));
  }, []);

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

  const resetForm = useCallback(() => {
    setFormState(initialFormState);
  }, []);

  return {
    formState,
    handlers: {
      updateFormValues,
      updateContext,
      updateAdditionalContext,
      updateTone,
      updateStyle,
      updatePlatform,
      updateModel,
      updateProvider,
      updateTemperature,
      resetForm,
    },
  };
}
