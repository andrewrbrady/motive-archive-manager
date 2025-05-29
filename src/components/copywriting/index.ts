// Base copywriter component and types
export { BaseCopywriter } from "./BaseCopywriter";
export type {
  CopywriterConfig,
  CopywriterData,
  CopywriterCallbacks,
} from "./BaseCopywriter";

// Specific copywriter implementations
export { CarCopywriter } from "./CarCopywriter";
export { ProjectCopywriter } from "./ProjectCopywriter";

// Re-export shared types from caption-generator
export type {
  ProjectCar,
  ProjectEvent,
  SavedCaption,
  PromptTemplate,
  Tone,
  Style,
  Platform,
} from "../projects/caption-generator/types";
