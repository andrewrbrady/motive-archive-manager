// Export all prompt-related handlers and types
export {
  usePromptManager,
  usePromptModal,
  usePromptHandlers,
  type PromptState,
  type PromptFormValues,
  type PromptModalState,
  type PromptHandlerCallbacks,
} from "./promptHandlers";

// Export all form-related handlers and types
export {
  useFormState,
  useFormValidation,
  useFormSubmission,
  DEFAULT_FORM_VALUES,
  type FormState,
  type FormHandlers,
} from "./formHandlers";

// Export all generation-related handlers and types
export {
  useGenerationHandlers,
  useCaptionSaver,
  useSavedCaptions,
  type GenerationState,
  type GenerationContext,
} from "./generationHandlers";

// Re-export types from the main types file for convenience
export type {
  ProjectCar,
  ProjectEvent,
  SavedCaption,
  LengthSetting,
  SystemPrompt,
  PromptTemplate,
  Platform,
  Template,
  Tone,
  Style,
} from "../types";
