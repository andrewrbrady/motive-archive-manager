/**
 * Documentation optimization exports for Phase 1C
 * Follows the proven architecture split pattern from Events/Specifications
 */

export { default as DocumentationOptimized } from "./DocumentationOptimized";
export { default as BaseDocumentation } from "./BaseDocumentation";
export { default as DocumentationEditor } from "./DocumentationEditor";
export {
  DocumentationSkeleton,
  FileListSkeleton,
} from "./DocumentationSkeleton";
export type { DocumentationFile } from "./BaseDocumentation";

// Performance hooks
export { useDocumentationPerformance } from "./DocumentationOptimized";
export { useDocumentationSync } from "./BaseDocumentation";
