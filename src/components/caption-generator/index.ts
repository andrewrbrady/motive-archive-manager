// Modular Caption Generator - Following Projects UX Patterns
export { CaptionGenerator } from "./CaptionGenerator";

// Sub-components
export { CarSelection } from "./CarSelection";
export { EventSelection } from "./EventSelection";
export { SystemPromptSelection } from "./SystemPromptSelection";
export { CaptionPreview } from "./CaptionPreview";
export { GenerationControls } from "./GenerationControls";
export { PromptEditModal } from "./PromptEditModal";

// Hooks
export { useCaptionData } from "./hooks/useCaptionData";
export { useFormState } from "./hooks/useFormState";
export { useGenerationHandlers } from "./hooks/useGenerationHandlers";

// Types
export type {
  CaptionFormState,
  GenerationContext,
  SavedCaption,
  PromptTemplate,
} from "./types";
