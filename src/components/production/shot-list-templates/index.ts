// Main component exports
export { ShotListTemplatesTab } from "./ShotListTemplatesTab";

// Sub-component exports
export { TemplateHeader } from "./TemplateHeader";
export { TemplateGrid } from "./TemplateGrid";
export { TemplateViewer } from "./TemplateViewer";
export { TemplateEditor } from "./TemplateEditor";
export { ImageBrowser } from "./ImageBrowser";

// Hook exports
export { useTemplateManager } from "./hooks/useTemplateManager";

// Type exports
export type {
  ShotTemplate,
  Template,
  ShotListTemplatesTabProps,
  ImageBrowserProps,
  TemplateHeaderProps,
  TemplateGridProps,
  TemplateViewerProps,
  TemplateEditorProps,
} from "./types";
